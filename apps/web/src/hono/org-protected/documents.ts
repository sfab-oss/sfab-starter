import { zValidator } from "@hono/zod-validator";
import { can } from "@workspace/auth/access-control";
import {
  createDocumentSchema,
  documentTypeSchema,
  lineItemInputSchema,
} from "@workspace/contract/transaction";
import { listActivity } from "@workspace/core/activity";
import { getActiveMemberRole } from "@workspace/core/auth";
import {
  addLineItem,
  applyCreditNoteDisposition,
  createDocument,
  finalizeDocument,
  getDocumentWithLines,
  listDocuments,
} from "@workspace/core/transaction";
import { Hono } from "hono";
import { z } from "zod";
import { requirePermission } from "../middleware/auth";
import type { HonoContextWithAuthAndOrg } from "../types";

const documentIdSchema = z.object({ id: z.string() });

const documentsRoute = new Hono<HonoContextWithAuthAndOrg>()
  .get(
    "/",
    zValidator(
      "query",
      z.object({
        type: documentTypeSchema.optional(),
        entityId: z.string().optional(),
      })
    ),
    async (c) => {
      const orgId = c.get("session").activeOrganizationId;
      const { type, entityId } = c.req.valid("query");
      const data = await listDocuments(orgId, {
        ...(type && { type }),
        ...(entityId && { entityId }),
      });
      return c.json({ data });
    }
  )
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
      const doc = await createDocument(orgId, body);
      return c.json(doc);
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
      const line = await addLineItem(orgId, id, body);
      return c.json(line);
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
      const result = await finalizeDocument(id, orgId, {
        actorId: userId,
        bypassCreditLimit: can("credit:bypass", { role }),
      });
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
      const result = await applyCreditNoteDisposition(
        id,
        orgId,
        body.disposition,
        {
          targetDocumentId: body.targetDocumentId,
          actorId: userId,
        }
      );
      return c.json(result);
    }
  );

export default documentsRoute;
