import { zValidator } from "@hono/zod-validator";
import {
  depositCreditSchema,
  redeemCreditByReferenceSchema,
  redeemCreditSchema,
} from "@workspace/contract/transaction";
import {
  depositCredit,
  getCreditBalance,
  listCreditEntries,
  redeemCredit,
  redeemCreditByReference,
} from "@workspace/core/transaction";
import { Hono } from "hono";
import { z } from "zod";
import { requirePermission } from "../middleware/auth";
import { domainErrorHandler } from "../middleware/domain-error";
import type { HonoContextWithAuthAndOrg } from "../types";

const walletRoute = new Hono<HonoContextWithAuthAndOrg>()
  .onError(domainErrorHandler)
  .get("/entries", async (c) => {
    const orgId = c.get("session").activeOrganizationId;
    const entityId = c.req.query("entityId");
    const data = await listCreditEntries(
      orgId,
      entityId ? { entityId } : undefined
    );
    return c.json({ data });
  })
  .get(
    "/balance/:entityId",
    zValidator("param", z.object({ entityId: z.string() })),
    async (c) => {
      const orgId = c.get("session").activeOrganizationId;
      const { entityId } = c.req.valid("param");
      const balance = await getCreditBalance(entityId, orgId);
      return c.json({ entityId, creditBalance: balance });
    }
  )
  .post(
    "/deposit",
    requirePermission("document:write"),
    zValidator("json", depositCreditSchema),
    async (c) => {
      const orgId = c.get("session").activeOrganizationId;
      const userId = c.get("session").userId;
      const body = c.req.valid("json");
      const result = await depositCredit(orgId, body, { actorId: userId });
      return c.json(result);
    }
  )
  .post(
    "/redeem",
    requirePermission("document:write"),
    zValidator("json", redeemCreditSchema),
    async (c) => {
      const orgId = c.get("session").activeOrganizationId;
      const userId = c.get("session").userId;
      const body = c.req.valid("json");
      const result = await redeemCredit(orgId, body, { actorId: userId });
      return c.json(result);
    }
  )
  .post(
    "/redeem-by-reference",
    requirePermission("document:write"),
    zValidator("json", redeemCreditByReferenceSchema),
    async (c) => {
      const orgId = c.get("session").activeOrganizationId;
      const userId = c.get("session").userId;
      const body = c.req.valid("json");
      const result = await redeemCreditByReference(orgId, body, {
        actorId: userId,
      });
      return c.json(result);
    }
  );

export { walletRoute };
