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
      return c.json(await createDocument(orgId, body));
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
      return c.json(await addLineItem(orgId, id, body));
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
      return c.json(await updateLineItem(orgId, id, lineId, body));
    }
  )
  .delete(
    "/:id/lines/:lineId",
    requirePermission("document:write"),
    zValidator("param", lineIdSchema),
    async (c) => {
      const orgId = c.get("session").activeOrganizationId;
      const { id, lineId } = c.req.valid("param");
      return c.json(await removeLineItem(orgId, id, lineId));
    }
  )
  .post(
    "/:id/accept",
    requirePermission("document:write"),
    zValidator("param", documentIdSchema),
    async (c) => {
      const orgId = c.get("session").activeOrganizationId;
      const userId = c.get("session").userId;
      const { id } = c.req.valid("param");
      return c.json(await acceptDocument(orgId, id, { actorId: userId }));
    }
  )
  .post(
    "/:id/successor",
    requirePermission("document:write"),
    zValidator("param", documentIdSchema),
    zValidator("json", createSuccessorSchema),
    async (c) => {
      const orgId = c.get("session").activeOrganizationId;
      const userId = c.get("session").userId;
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      return c.json(
        await createSuccessor(orgId, id, body, { actorId: userId })
      );
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
      return c.json(
        await finalizeDocument(id, orgId, {
          actorId: userId,
          bypassCreditLimit: can("credit:bypass", { role }),
        })
      );
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
      return c.json(
        await applyCreditNoteDisposition(id, orgId, body.disposition, {
          targetDocumentId: body.targetDocumentId,
          actorId: userId,
        })
      );
    }
  );

export default documentsRoute;
