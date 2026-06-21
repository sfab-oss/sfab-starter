import { db } from "@workspace/db";
import type * as schema from "@workspace/db/schema";
import { member } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";

export async function getUserOrganization(
  { userId }: { userId: string },
  db: DrizzleD1Database<typeof schema>
) {
  const membership = await db.query.member.findFirst({
    where: eq(member.userId, userId),
  });

  return membership;
}

/**
 * The caller's stored role within a specific organization, or `null` if they
 * are not a member of it. The value is the raw `member.role`
 * (`"owner" | "admin" | "member"`) — feed it through `can()` / `ROLE_LABELS`
 * from `@workspace/auth/access-control` for authorization and display.
 *
 * This is the single source both RBAC guards read to resolve a caller's role:
 * the Hono `requirePermission` middleware and the agent-tool `assertCan` guard.
 * better-auth exposes `auth.api.getActiveMemberRole`, but that endpoint is
 * request/`headers`-bound (it resolves the session's active org); this helper
 * takes an explicit `{userId, organizationId}` so the *same* resolution works
 * in the agent's Durable Object context, which has no request headers. Keeping
 * one `(userId, orgId)` path beats splitting role resolution across two
 * surfaces. (`can()` itself is still built on better-auth's `authorize()`.)
 */
export async function getActiveMemberRole({
  userId,
  organizationId,
}: {
  userId: string;
  organizationId: string;
}): Promise<string | null> {
  const membership = await db.query.member.findFirst({
    where: and(
      eq(member.userId, userId),
      eq(member.organizationId, organizationId)
    ),
  });

  return membership?.role ?? null;
}
