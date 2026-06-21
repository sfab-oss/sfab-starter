import { zValidator } from "@hono/zod-validator";
import { createMovementSchema } from "@workspace/contract/catalog";
import { performStockMovement } from "@workspace/core/catalog";
import { Hono } from "hono";
import { requirePermission } from "../../middleware/auth";
import type { HonoContextWithAuthAndOrg } from "../../types";

const movementsRoute = new Hono<HonoContextWithAuthAndOrg>().post(
  "/",
  requirePermission("catalog:write"),
  zValidator("json", createMovementSchema),
  async (c) => {
    const orgId = c.get("session").activeOrganizationId;
    const body = c.req.valid("json");
    await performStockMovement({ ...body, orgId });
    return c.json({ success: true });
  }
);

export default movementsRoute;
