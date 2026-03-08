import { Hono } from "hono";
import { extractAuth, requireAuth } from "../middleware/auth";
import type { HonoContext, HonoContextWithAuth } from "../types";
import chatRoutes from "./chat";
import { inventoryRoutes } from "./inventory";
import { organizationRoutes } from "./organization";
import transcribeRoutes from "./transcribe";

const meRoute = new Hono<HonoContextWithAuth>().get("/me", (c) => {
  const user = c.get("user");
  const session = c.get("session");
  return c.json({ user, session });
});

export const protectedRoutes = new Hono<HonoContext>()
  .use("*", extractAuth)
  .use("*", requireAuth)
  .route("/", meRoute)
  .route("/chat", chatRoutes)
  .route("/inventory", inventoryRoutes)
  .route("/organization", organizationRoutes)
  .route("/transcribe", transcribeRoutes);
