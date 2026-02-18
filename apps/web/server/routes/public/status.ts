import type { HonoContext } from "@workspace/types/hono";
import { Hono } from "hono";

const statusRoutes = new Hono<HonoContext>().get("/", (c) => {
  return c.json({
    status: "ok",
    version: "1.0.0",
    features: ["authentication", "api"],
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default statusRoutes;
