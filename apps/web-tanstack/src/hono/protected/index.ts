import { Hono } from "hono";
import { extractAuth, requireAuth } from "../middleware/auth";
import type { HonoContext, HonoContextWithAuth } from "../types";

const meRoute = new Hono<HonoContextWithAuth>().get("/me", (c) => {
  const user = c.get("user");
  const session = c.get("session");
  return c.json({ user, session });
});

export const protectedRoutes = new Hono<HonoContext>()
  .use("*", extractAuth)
  .use("*", requireAuth)
  .route("/", meRoute);
