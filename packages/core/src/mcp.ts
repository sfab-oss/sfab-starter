import { db } from "@workspace/db";
import {
  mcpOrganizationGrant,
  member,
  oauthAccessToken,
  oauthClient,
  oauthRefreshToken,
  organization,
  user,
} from "@workspace/db/schema";
import { createId } from "@workspace/db/utils";
import { and, desc, eq } from "drizzle-orm";

export interface McpGrant {
  organizationId: string;
  organizationSlug: string;
  userId: string;
}

export async function resolveMcpGrant(params: {
  clientId: string;
  userId: string;
}): Promise<McpGrant | null> {
  const [row] = await db
    .select({
      organizationId: mcpOrganizationGrant.organizationId,
      organizationSlug: organization.slug,
    })
    .from(mcpOrganizationGrant)
    .innerJoin(
      organization,
      eq(organization.id, mcpOrganizationGrant.organizationId)
    )
    .innerJoin(
      oauthClient,
      and(
        eq(oauthClient.clientId, mcpOrganizationGrant.clientId),
        eq(oauthClient.disabled, false)
      )
    )
    .where(
      and(
        eq(mcpOrganizationGrant.clientId, params.clientId),
        eq(mcpOrganizationGrant.userId, params.userId)
      )
    )
    .limit(1);

  if (!row) {
    return null;
  }

  const [stillMember] = await db
    .select({ id: member.id })
    .from(member)
    .where(
      and(
        eq(member.organizationId, row.organizationId),
        eq(member.userId, params.userId)
      )
    )
    .limit(1);

  if (!stillMember) {
    return null;
  }

  return {
    userId: params.userId,
    organizationId: row.organizationId,
    organizationSlug: row.organizationSlug,
  };
}

export async function upsertMcpOrganizationGrant(params: {
  clientId: string;
  userId: string;
  organizationId: string;
}): Promise<void> {
  await db
    .insert(mcpOrganizationGrant)
    .values({
      id: createId("mcpgrant"),
      clientId: params.clientId,
      userId: params.userId,
      organizationId: params.organizationId,
    })
    .onConflictDoUpdate({
      target: [mcpOrganizationGrant.clientId, mcpOrganizationGrant.userId],
      set: {
        organizationId: params.organizationId,
        updatedAt: new Date(),
      },
    });
}

export async function isOrganizationMember(params: {
  userId: string;
  organizationId: string;
}): Promise<boolean> {
  const [row] = await db
    .select({ id: member.id })
    .from(member)
    .where(
      and(
        eq(member.organizationId, params.organizationId),
        eq(member.userId, params.userId)
      )
    )
    .limit(1);
  return Boolean(row);
}

export async function organizationExists(
  organizationId: string
): Promise<boolean> {
  const [row] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);
  return Boolean(row);
}

export async function oauthClientExists(clientId: string): Promise<boolean> {
  const [row] = await db
    .select({ clientId: oauthClient.clientId })
    .from(oauthClient)
    .where(eq(oauthClient.clientId, clientId))
    .limit(1);
  return Boolean(row);
}

export async function isOrgOwnerOrAdmin(params: {
  userId: string;
  organizationId: string;
}): Promise<boolean> {
  const [row] = await db
    .select({ role: member.role })
    .from(member)
    .where(
      and(
        eq(member.organizationId, params.organizationId),
        eq(member.userId, params.userId)
      )
    )
    .limit(1);
  return row?.role === "owner" || row?.role === "admin";
}

export interface McpConnection {
  clientId: string;
  clientName: string | null;
  clientIcon: string | null;
  userId: string;
  userName: string;
  userEmail: string;
  userImage: string | null;
  organizationId: string;
  grantedAt: Date;
  updatedAt: Date;
  lastUsedAt: Date;
}

export function listMcpConnectionsForUser(params: {
  organizationId: string;
  userId: string;
}): Promise<McpConnection[]> {
  return listMcpConnections({
    organizationId: params.organizationId,
    userId: params.userId,
  });
}

export function listMcpConnectionsForOrg(params: {
  organizationId: string;
}): Promise<McpConnection[]> {
  return listMcpConnections({ organizationId: params.organizationId });
}

async function listMcpConnections(params: {
  organizationId: string;
  userId?: string;
}): Promise<McpConnection[]> {
  const rows = await db
    .select({
      clientId: mcpOrganizationGrant.clientId,
      clientName: oauthClient.name,
      clientIcon: oauthClient.icon,
      userId: mcpOrganizationGrant.userId,
      userName: user.name,
      userEmail: user.email,
      userImage: user.image,
      organizationId: mcpOrganizationGrant.organizationId,
      grantedAt: mcpOrganizationGrant.createdAt,
      updatedAt: mcpOrganizationGrant.updatedAt,
    })
    .from(mcpOrganizationGrant)
    .innerJoin(
      oauthClient,
      and(
        eq(oauthClient.clientId, mcpOrganizationGrant.clientId),
        eq(oauthClient.disabled, false)
      )
    )
    .innerJoin(user, eq(user.id, mcpOrganizationGrant.userId))
    .where(
      and(
        eq(mcpOrganizationGrant.organizationId, params.organizationId),
        params.userId
          ? eq(mcpOrganizationGrant.userId, params.userId)
          : undefined
      )
    )
    .orderBy(desc(mcpOrganizationGrant.updatedAt));

  return rows.map((row) => ({
    clientId: row.clientId,
    clientName: row.clientName,
    clientIcon: row.clientIcon,
    userId: row.userId,
    userName: row.userName,
    userEmail: row.userEmail,
    userImage: row.userImage,
    organizationId: row.organizationId,
    grantedAt: row.grantedAt,
    updatedAt: row.updatedAt,
    lastUsedAt: row.updatedAt,
  }));
}

export type RevokeMcpConnectionResult =
  | { ok: true; deletedClient: boolean }
  | { ok: false; reason: "not_found" };

export async function revokeMcpConnection(params: {
  clientId: string;
  userId: string;
  organizationId: string;
}): Promise<RevokeMcpConnectionResult> {
  const [grant] = await db
    .select({ id: mcpOrganizationGrant.id })
    .from(mcpOrganizationGrant)
    .where(
      and(
        eq(mcpOrganizationGrant.clientId, params.clientId),
        eq(mcpOrganizationGrant.userId, params.userId),
        eq(mcpOrganizationGrant.organizationId, params.organizationId)
      )
    )
    .limit(1);

  if (!grant) {
    return { ok: false, reason: "not_found" };
  }

  await db.batch([
    db
      .delete(mcpOrganizationGrant)
      .where(eq(mcpOrganizationGrant.id, grant.id)),
    db
      .delete(oauthRefreshToken)
      .where(
        and(
          eq(oauthRefreshToken.clientId, params.clientId),
          eq(oauthRefreshToken.userId, params.userId)
        )
      ),
    db
      .delete(oauthAccessToken)
      .where(
        and(
          eq(oauthAccessToken.clientId, params.clientId),
          eq(oauthAccessToken.userId, params.userId)
        )
      ),
  ]);

  const [remaining] = await db
    .select({ id: mcpOrganizationGrant.id })
    .from(mcpOrganizationGrant)
    .where(eq(mcpOrganizationGrant.clientId, params.clientId))
    .limit(1);

  if (remaining) {
    return { ok: true, deletedClient: false };
  }

  await db.delete(oauthClient).where(eq(oauthClient.clientId, params.clientId));

  return { ok: true, deletedClient: true };
}
