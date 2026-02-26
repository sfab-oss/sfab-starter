import { Hono } from "hono";

export const statusRoutes = new Hono().get("/", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});
