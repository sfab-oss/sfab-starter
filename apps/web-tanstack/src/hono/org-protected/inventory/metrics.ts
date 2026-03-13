import { getDashboardMetrics } from "@workspace/core/products";
import { Hono } from "hono";
import type { HonoContextWithAuthAndOrg } from "../../types";

const metricsRoute = new Hono<HonoContextWithAuthAndOrg>().get(
  "/",
  async (c) => {
    const userId = c.get("user").id;
    const data = await getDashboardMetrics(userId);
    return c.json(data);
  }
);

export default metricsRoute;
