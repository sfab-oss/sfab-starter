import { auth } from "@workspace/auth";
import type { HonoContext } from "@workspace/types/hono";
import type { Context, Next } from "hono";

export const honoAuthMiddleware = async (
  c: Context<HonoContext>,
  next: Next
) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    c.set("auth", null);
    return next();
  }

  c.set("auth", {
    userId: session.user.id,
    sessionId: session.session.id,
    expiresAt: session.session.expiresAt,
  });
  await next();
};

export const honoAuthCheckMiddleware = async (
  c: Context<HonoContext>,
  next: Next
) => {
  const auth = c.get("auth");

  if (!auth) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("auth", auth);
  await next();
};
