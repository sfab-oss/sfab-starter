import { zValidator } from "@hono/zod-validator";
import { performStockMovement } from "@workspace/core/products";
import { createMovementSchema } from "@workspace/types/products";
import { Hono } from "hono";
import type { HonoContextWithAuthAndOrg } from "../../types";

const movementsRoute = new Hono<HonoContextWithAuthAndOrg>().post(
  "/",
  zValidator("json", createMovementSchema),
  async (c) => {
    const orgId = c.get("session").activeOrganizationId;
    const body = c.req.valid("json");
    await performStockMovement({ ...body, orgId });
    return c.json({ success: true });
  }
);

export default movementsRoute;
