import { getDashboardMetrics } from "@workspace/core/products";
import { Hono } from "hono";
import type { HonoContextWithAuthAndOrg } from "../../types";

const metricsRoute = new Hono<HonoContextWithAuthAndOrg>().get(
  "/",
  async (c) => {
    const orgId = c.get("session").activeOrganizationId;
    const data = await getDashboardMetrics(orgId);
    return c.json(data);
  }
);

export default metricsRoute;
