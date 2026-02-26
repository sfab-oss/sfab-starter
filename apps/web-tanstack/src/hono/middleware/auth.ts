import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";

export interface AuthVars {
  userId: string | null;
  userRole: string | null;
}

export const extractAuth = async (
  c: Context<{ Variables: AuthVars }>,
  next: Next
) => {
  const token =
    getCookie(c, "auth_token") ??
    c.req.header("Authorization")?.replace("Bearer ", "");
  if (token) {
    // TODO: Integrate with @workspace/auth
    c.set("userId", "user-from-token");
    c.set("userRole", "member");
  }
  await next();
};

export const requireAuth = async (
  c: Context<{ Variables: AuthVars }>,
  next: Next
) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
};
