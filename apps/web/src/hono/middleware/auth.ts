import { auth } from "@workspace/auth";
import type { Action } from "@workspace/auth/access-control";
import { can } from "@workspace/auth/access-control";
import { getActiveMemberRole } from "@workspace/core/auth";
import type { Context, Next } from "hono";
import type {
  HonoContext,
  HonoContextWithAuth,
  HonoContextWithAuthAndOrg,
} from "../types";

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

/**
 * Server-side RBAC guard — the single decision point for gating an org-protected
 * route. Resolves the caller's role for their active organization and 403s
 * before the handler runs when `can(action, ...)` is false. Closes the gap
 * where any member could call any org-protected endpoint.
 *
 * Use after requireActiveOrg, scoped to the gated route(s):
 *   routes.post("/:id/void", requirePermission("document:void"), handler)
 */
export const requirePermission =
  (action: Action) =>
  async (c: Context<HonoContextWithAuthAndOrg>, next: Next) => {
    const user = c.get("user");
    const session = c.get("session");
    const role = await getActiveMemberRole({
      userId: user.id,
      organizationId: session.activeOrganizationId,
    });
    if (!can(action, { role })) {
      return c.json({ error: "Forbidden" }, 403);
    }
    await next();
  };
