import { Hono } from "hono";
import type { AuthVars } from "../middleware/auth";
import { extractAuth, requireAuth } from "../middleware/auth";

export const protectedRoutes = new Hono<{ Variables: AuthVars }>()
  .use("*", extractAuth)
  .use("*", requireAuth)
  .get("/me", (c) => {
    const userId = c.get("userId");
    const userRole = c.get("userRole");
    return c.json({
      userId,
      userRole,
    });
  });
