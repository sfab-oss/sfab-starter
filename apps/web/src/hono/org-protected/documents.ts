import { zValidator } from "@hono/zod-validator";
import { can } from "@workspace/auth/access-control";
import {
  createDocumentSchema,
  createSuccessorSchema,
  lineItemInputSchema,
  listDocumentsQuerySchema,
  updateLineItemSchema,
} from "@workspace/contract/transaction";
import { listActivity } from "@workspace/core/activity";
import { getActiveMemberRole } from "@workspace/core/auth";
import { DomainError } from "@workspace/core/errors";
import {
  acceptDocument,
  addLineItem,
  applyCreditNoteDisposition,
  createDocument,
  createSuccessor,
  finalizeDocument,
  getDocumentWithLines,
  getPaginatedDocuments,
  removeLineItem,
  updateLineItem,
} from "@workspace/core/transaction";
import { Hono } from "hono";
import { z } from "zod";
import { requirePermission } from "../middleware/auth";
import type { HonoContextWithAuthAndOrg } from "../types";

const documentIdSchema = z.object({ id: z.string() });
const lineIdSchema = z.object({ id: z.string(), lineId: z.string() });

function domainErrorStatus(error: DomainError): 404 | 409 | 422 {
  if (error.code === "not_found") {
    return 404;
  }
  if (error.code === "conflict") {
    return 409;
  }
  return 422;
}

async function handleDomain<T>(
  c: { json: (body: unknown, status?: 404 | 409 | 422) => Response },
  fn: () => Promise<T>
): Promise<T | Response> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof DomainError) {
      return c.json({ error: error.message }, domainErrorStatus(error));
    }
    throw error;
  }
}

const documentsRoute = new Hono<HonoContextWithAuthAndOrg>()
  .get("/", zValidator("query", listDocumentsQuerySchema), async (c) => {
    const orgId = c.get("session").activeOrganizationId;
    const params = c.req.valid("query");
    const data = await getPaginatedDocuments(orgId, params);
    return c.json(data);
  })
  .get("/activity", async (c) => {
    const orgId = c.get("session").activeOrganizationId;
    const entityId = c.req.query("entityId");
    const data = await listActivity(orgId, {
      entityType: "document",
      ...(entityId && { entityId }),
      limit: 20,
    });
    return c.json({ data });
  })
  .post(
    "/",
    requirePermission("document:write"),
    zValidator("json", createDocumentSchema),
    async (c) => {
      const orgId = c.get("session").activeOrganizationId;
      const body = c.req.valid("json");
      const result = await handleDomain(c, () => createDocument(orgId, body));
      if (result instanceof Response) {
        return result;
      }
      return c.json(result);
    }
  )
  .get("/:id", zValidator("param", documentIdSchema), async (c) => {
    const orgId = c.get("session").activeOrganizationId;
    const { id } = c.req.valid("param");
    const data = await getDocumentWithLines(id, orgId);
    if (!data) {
      return c.json({ error: "Document not found" }, 404);
    }
    return c.json(data);
  })
  .post(
    "/:id/lines",
    requirePermission("document:write"),
    zValidator("param", documentIdSchema),
    zValidator("json", lineItemInputSchema),
    async (c) => {
      const orgId = c.get("session").activeOrganizationId;
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const result = await handleDomain(c, () => addLineItem(orgId, id, body));
      if (result instanceof Response) {
        return result;
      }
      return c.json(result);
    }
  )
  .put(
    "/:id/lines/:lineId",
    requirePermission("document:write"),
    zValidator("param", lineIdSchema),
    zValidator("json", updateLineItemSchema),
    async (c) => {
      const orgId = c.get("session").activeOrganizationId;
      const { id, lineId } = c.req.valid("param");
      const body = c.req.valid("json");
      const result = await handleDomain(c, () =>
        updateLineItem(orgId, id, lineId, body)
      );
      if (result instanceof Response) {
        return result;
      }
      return c.json(result);
    }
  )
  .delete(
    "/:id/lines/:lineId",
    requirePermission("document:write"),
    zValidator("param", lineIdSchema),
    async (c) => {
      const orgId = c.get("session").activeOrganizationId;
      const { id, lineId } = c.req.valid("param");
      const result = await handleDomain(c, () =>
        removeLineItem(orgId, id, lineId)
      );
      if (result instanceof Response) {
        return result;
      }
      return c.json(result);
    }
  )
  .post(
    "/:id/accept",
    requirePermission("document:write"),
    zValidator("param", documentIdSchema),
    async (c) => {
      const orgId = c.get("session").activeOrganizationId;
      const { id } = c.req.valid("param");
      const result = await handleDomain(c, () => acceptDocument(orgId, id));
      if (result instanceof Response) {
        return result;
      }
      return c.json(result);
    }
  )
  .post(
    "/:id/successor",
    requirePermission("document:write"),
    zValidator("param", documentIdSchema),
    zValidator("json", createSuccessorSchema),
    async (c) => {
      const orgId = c.get("session").activeOrganizationId;
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const result = await handleDomain(c, () =>
        createSuccessor(orgId, id, body)
      );
      if (result instanceof Response) {
        return result;
      }
      return c.json(result);
    }
  )
  .post(
    "/:id/finalize",
    requirePermission("document:write"),
    zValidator("param", documentIdSchema),
    async (c) => {
      const orgId = c.get("session").activeOrganizationId;
      const userId = c.get("session").userId;
      const { id } = c.req.valid("param");
      const role = await getActiveMemberRole({
        userId,
        organizationId: orgId,
      });
      const result = await handleDomain(c, () =>
        finalizeDocument(id, orgId, {
          actorId: userId,
          bypassCreditLimit: can("credit:bypass", { role }),
        })
      );
      if (result instanceof Response) {
        return result;
      }
      return c.json(result);
    }
  )
  .post(
    "/:id/disposition",
    requirePermission("document:write"),
    zValidator("param", documentIdSchema),
    zValidator(
      "json",
      z.object({
        disposition: z.enum([
          "cash_refund",
          "store_credit",
          "apply_to_document",
        ]),
        targetDocumentId: z.string().optional(),
      })
    ),
    async (c) => {
      const orgId = c.get("session").activeOrganizationId;
      const userId = c.get("session").userId;
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const result = await handleDomain(c, () =>
        applyCreditNoteDisposition(id, orgId, body.disposition, {
          targetDocumentId: body.targetDocumentId,
          actorId: userId,
        })
      );
      if (result instanceof Response) {
        return result;
      }
      return c.json(result);
    }
  );

export default documentsRoute;
