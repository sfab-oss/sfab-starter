import { zValidator } from "@hono/zod-validator";
import {
  recordPaymentSchema,
  reversePaymentSchema,
} from "@workspace/contract/transaction";
import {
  getPaymentWithAllocations,
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
  );

export { paymentsRoute };
