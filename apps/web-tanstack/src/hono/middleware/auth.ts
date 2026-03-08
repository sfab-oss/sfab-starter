import { auth } from "@workspace/auth";
import type { Context, Next } from "hono";
import type { HonoContext, HonoContextWithAuth } from "../types";

export const extractAuth = async (c: Context<HonoContext>, next: Next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    c.set("user", null);
    c.set("session", null);
    await next();
    return;
  }

  c.set("user", session.user);
  c.set("session", session.session);
  await next();
};

export const requireAuth = async (
  c: Context<HonoContextWithAuth>,
  next: Next
) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
};

export const requireActiveOrg = async (
  c: Context<HonoContextWithAuth>,
  next: Next
) => {
  const session = c.get("session");
  if (!session?.activeOrganizationId) {
    return c.json({ error: "No active organization" }, 403);
  }
  await next();
};
