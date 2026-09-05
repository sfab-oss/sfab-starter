import { zValidator } from "@hono/zod-validator";
import { revokeMcpConnectionSchema } from "@workspace/contract/mcp-connections";
import {
  isOrgOwnerOrAdmin,
  listMcpConnectionsForOrg,
  listMcpConnectionsForUser,
  type McpConnection,
  revokeMcpConnection,
} from "@workspace/core/mcp";
import { Hono } from "hono";
import type { HonoContextWithAuthAndOrg } from "../types";

function toDto(row: McpConnection) {
  return {
    clientId: row.clientId,
    clientName: row.clientName,
    clientIcon: row.clientIcon,
    userId: row.userId,
    userName: row.userName,
    userEmail: row.userEmail,
    userImage: row.userImage,
    organizationId: row.organizationId,
    grantedAt: row.grantedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastUsedAt: row.lastUsedAt.toISOString(),
  };
}

const mcpRoutes = new Hono<HonoContextWithAuthAndOrg>()
  .get("/connections/mine", async (c) => {
    const { activeOrganizationId } = c.get("session");
    const user = c.get("user");
    const items = await listMcpConnectionsForUser({
      organizationId: activeOrganizationId,
      userId: user.id,
    });
    return c.json({ items: items.map(toDto) });
  })
  .get("/connections/org", async (c) => {
    const { activeOrganizationId } = c.get("session");
    const user = c.get("user");
    const allowed = await isOrgOwnerOrAdmin({
      organizationId: activeOrganizationId,
      userId: user.id,
    });
    if (!allowed) {
      return c.json({ error: "Forbidden" }, 403);
    }
    const items = await listMcpConnectionsForOrg({
      organizationId: activeOrganizationId,
    });
    return c.json({ items: items.map(toDto) });
  })
  .post(
    "/connections/revoke",
    zValidator("json", revokeMcpConnectionSchema),
    async (c) => {
      const { activeOrganizationId } = c.get("session");
      const user = c.get("user");
      const body = c.req.valid("json");
      const targetUserId = body.userId ?? user.id;

      if (targetUserId !== user.id) {
        const allowed = await isOrgOwnerOrAdmin({
          organizationId: activeOrganizationId,
          userId: user.id,
        });
        if (!allowed) {
          return c.json({ error: "Forbidden" }, 403);
        }
      }

      const result = await revokeMcpConnection({
        clientId: body.clientId,
        userId: targetUserId,
        organizationId: activeOrganizationId,
      });

      if (!result.ok) {
        return c.json({ error: "Connection not found" }, 404);
      }

      return c.json({ ok: true as const, deletedClient: result.deletedClient });
    }
  );

export default mcpRoutes;
