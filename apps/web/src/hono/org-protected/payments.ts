import { zValidator } from "@hono/zod-validator";
import {
  createEntitySchema,
  recordPaymentSchema,
  reversePaymentSchema,
} from "@workspace/contract/transaction";
import {
  applyCreditNoteDisposition,
  createEntity,
  getEntity,
  getPaymentWithAllocations,
  listEntities,
  listPayments,
  recordPayment,
  reversePayment,
} from "@workspace/core/transaction";
import { Hono } from "hono";
import { z } from "zod";
import { requirePermission } from "../middleware/auth";
import { domainErrorHandler } from "../middleware/domain-error";
import type { HonoContextWithAuthAndOrg } from "../types";

const idSchema = z.object({ id: z.string() });

const paymentsRoute = new Hono<HonoContextWithAuthAndOrg>()
  .onError(domainErrorHandler)
  .get("/", async (c) => {
    const orgId = c.get("session").activeOrganizationId;
    const entityId = c.req.query("entityId");
    const data = await listPayments(orgId, entityId ? { entityId } : undefined);
    return c.json({ data });
  })
  .get("/:id", zValidator("param", idSchema), async (c) => {
    const orgId = c.get("session").activeOrganizationId;
    const { id } = c.req.valid("param");
    const data = await getPaymentWithAllocations(id, orgId);
    if (!data) {
      return c.json({ error: "Payment not found" }, 404);
    }
    return c.json(data);
  })
  .post(
    "/",
    requirePermission("document:write"),
    zValidator("json", recordPaymentSchema),
    async (c) => {
      const orgId = c.get("session").activeOrganizationId;
      const userId = c.get("session").userId;
      const body = c.req.valid("json");
      const result = await recordPayment(orgId, body, { actorId: userId });
      return c.json(result);
    }
  )
  .post(
    "/:id/reverse",
    requirePermission("payment:reverse"),
    zValidator("param", idSchema),
    zValidator("json", reversePaymentSchema.optional()),
    async (c) => {
      const orgId = c.get("session").activeOrganizationId;
      const userId = c.get("session").userId;
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const result = await reversePayment(id, orgId, {
        actorId: userId,
        reason: body?.reason,
      });
      return c.json(result);
    }
  )
  .post(
    "/:id/disposition",
    requirePermission("document:write"),
    zValidator("param", idSchema),
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

const entitiesRoute = new Hono<HonoContextWithAuthAndOrg>()
  .onError(domainErrorHandler)
  .get("/", async (c) => {
    const orgId = c.get("session").activeOrganizationId;
    const data = await listEntities(orgId);
    return c.json({ data });
  })
  .get("/:id", zValidator("param", idSchema), async (c) => {
    const orgId = c.get("session").activeOrganizationId;
    const { id } = c.req.valid("param");
    const data = await getEntity(id, orgId);
    if (!data) {
      return c.json({ error: "Entity not found" }, 404);
    }
    return c.json(data);
  })
  .post(
    "/",
    requirePermission("document:write"),
    zValidator("json", createEntitySchema),
    async (c) => {
      const orgId = c.get("session").activeOrganizationId;
      const body = c.req.valid("json");
      const entity = await createEntity(orgId, body);
      return c.json(entity);
    }
  );

export { paymentsRoute, entitiesRoute };
