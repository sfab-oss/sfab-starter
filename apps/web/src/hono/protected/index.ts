import { Hono } from "hono";
import { extractAuth, requireAuth } from "../middleware/auth";
import { orgProtectedRoutes } from "../org-protected";
import type { HonoContext, HonoContextWithAuth } from "../types";
import chatRoutes from "./chat";
import organizationRoutes from "./organization";

const meRoute = new Hono<HonoContextWithAuth>().get("/me", (c) => {
  const user = c.get("user");
  const session = c.get("session");
  return c.json({ user, session });
});

export const protectedRoutes = new Hono<HonoContext>()
  .use("*", extractAuth)
  .use("*", requireAuth)
  .route("/", meRoute)
  .route("/organization", organizationRoutes)
  .route("/chat", chatRoutes)
  .route("/", orgProtectedRoutes);
