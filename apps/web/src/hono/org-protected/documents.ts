import { zValidator } from "@hono/zod-validator";
import {
  createDocumentSchema,
  documentTypeSchema,
  lineItemInputSchema,
} from "@workspace/contract/transaction";
import {
  addLineItem,
  createDocument,
  finalizeDocument,
  getDocumentWithLines,
  listActivity,
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
    zValidator("query", z.object({ type: documentTypeSchema.optional() })),
    async (c) => {
      const orgId = c.get("session").activeOrganizationId;
      const { type } = c.req.valid("query");
      const data = await listDocuments(orgId, type);
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
      const result = await finalizeDocument(id, orgId, { actorId: userId });
      return c.json(result);
    }
  );

export default documentsRoute;
