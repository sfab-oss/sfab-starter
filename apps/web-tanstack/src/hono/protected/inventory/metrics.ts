import { getDashboardMetrics } from "@workspace/db-d1/services/products";
import { Hono } from "hono";
import type { HonoContextWithAuth } from "../../types";

const metricsRoute = new Hono<HonoContextWithAuth>().get("/", async (c) => {
  const userId = c.get("user").id;
  const data = await getDashboardMetrics(userId);
  return c.json(data);
});

export default metricsRoute;
