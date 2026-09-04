import { env, SELF } from "cloudflare:test";
import { mcpResource } from "@workspace/auth/mcp-resource";
import { describe, expect, it } from "vitest";
import {
  createOrgOnSession,
  createTestSessionWithOrg,
  ORIGIN,
} from "../helpers/auth";
import { mcpRpc, mintMcpAccessToken, readMcpJson } from "../helpers/mcp-oauth";

const RESOURCE = mcpResource(ORIGIN);

function mcpHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    ...extra,
  };
}

describe("MCP HTTP surface", () => {
  it("applies oauth schema migrations", async () => {
    const names = env.TEST_MIGRATIONS.map((m) => m.name);
    expect(names).toContain("0003_white_the_fury.sql");
    const row = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'oauth_resource'"
    ).first<{ name: string }>();
    expect(row?.name).toBe("oauth_resource");
  });
  it("GET /mcp returns 405 with Allow POST and OPTIONS", async () => {
    const res = await SELF.fetch(`${ORIGIN}/mcp`);
    expect(res.status).toBe(405);
    const allow = res.headers.get("Allow") ?? "";
    expect(allow).toContain("POST");
    expect(allow).toContain("OPTIONS");
  });

  it("POST /mcp without bearer returns 401 JSON-RPC and resource_metadata", async () => {
    const res = await SELF.fetch(`${ORIGIN}/mcp`, {
      method: "POST",
      headers: mcpHeaders({ Origin: ORIGIN }),
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {},
      }),
    });
    expect(res.status).toBe(401);
    const www = res.headers.get("WWW-Authenticate") ?? "";
    expect(www).toContain("resource_metadata=");
    expect(www).toContain("/.well-known/oauth-protected-resource/mcp");
    const body = (await res.json()) as {
      jsonrpc: string;
      error: { message: string };
    };
    expect(body.jsonrpc).toBe("2.0");
    expect(body.error.message.toLowerCase()).toContain("bearer");
  });

  it("foreign Origin is 403 and missing Origin is 401", async () => {
    const foreign = await SELF.fetch(`${ORIGIN}/mcp`, {
      method: "POST",
      headers: mcpHeaders({
        Origin: "https://evil.example",
        Authorization: "Bearer not-a-jwt",
      }),
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
    });
    expect(foreign.status).toBe(403);

    const missing = await SELF.fetch(`${ORIGIN}/mcp`, {
      method: "POST",
      headers: mcpHeaders({ Authorization: "Bearer not-a-jwt" }),
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
    });
    expect(missing.status).toBe(401);
  });

  it("well-known protected resource equals mcpResource", async () => {
    for (const path of [
      "/.well-known/oauth-protected-resource",
      "/.well-known/oauth-protected-resource/mcp",
    ]) {
      const res = await SELF.fetch(`${ORIGIN}${path}`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { resource: string };
      expect(body.resource).toBe(RESOURCE);
    }
  });
});

describe("MCP OAuth JWT happy path", () => {
  it("signed JWT reaches tools/list", async () => {
    const session = await createTestSessionWithOrg({ orgName: "MCP Org" });
    const { accessToken } = await mintMcpAccessToken({
      cookie: session.cookie,
      organizationId: session.orgId,
    });

    const res = await mcpRpc(accessToken, {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
      params: {},
    });
    expect(res.status).toBe(200);
    const body = (await readMcpJson(res)) as {
      result?: { tools?: { name: string }[] };
      error?: { message: string };
    };
    expect(body.error).toBeUndefined();
    const names = body.result?.tools?.map((tool) => tool.name) ?? [];
    expect(names).toContain("list_products");
    expect(names).not.toContain("delete_product");
  });

  it("grant org is bound at consent; extra org id cannot escape", async () => {
    const session = await createTestSessionWithOrg({ orgName: "Grant A" });
    await SELF.fetch(`${ORIGIN}/api/protected/catalog/products`, {
      method: "POST",
      headers: {
        Cookie: session.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Alpha Widget", sku: "A-001" }),
    });

    const orgB = await createOrgOnSession(session.cookie, "Grant B");
    const cookie = orgB.cookie;
    await SELF.fetch(`${ORIGIN}/api/auth/organization/set-active`, {
      method: "POST",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/json",
        Origin: ORIGIN,
      },
      body: JSON.stringify({ organizationSlug: orgB.orgSlug }),
    });
    await SELF.fetch(`${ORIGIN}/api/protected/catalog/products`, {
      method: "POST",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Beta Widget", sku: "B-001" }),
    });

    const { accessToken } = await mintMcpAccessToken({
      cookie,
      organizationId: session.orgId,
    });

    const listRes = await mcpRpc(accessToken, {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "list_products",
        arguments: { organizationId: orgB.orgId },
      },
    });
    expect(listRes.status).toBe(200);
    const listed = (await readMcpJson(listRes)) as {
      result?: { content?: { text?: string }[] };
    };
    const listedText = listed.result?.content?.[0]?.text ?? "";
    expect(listedText).toContain("Alpha Widget");
    expect(listedText).not.toContain("Beta Widget");

    const createRes = await mcpRpc(accessToken, {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "create_product",
        arguments: {
          name: "Escaped?",
          sku: "ESC-001",
          organizationId: orgB.orgId,
        },
      },
    });
    expect(createRes.status).toBe(200);

    await SELF.fetch(`${ORIGIN}/api/auth/organization/set-active`, {
      method: "POST",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/json",
        Origin: ORIGIN,
      },
      body: JSON.stringify({ organizationSlug: session.orgSlug }),
    });
    const inA = await SELF.fetch(`${ORIGIN}/api/protected/catalog/products`, {
      headers: { Cookie: cookie },
    });
    await SELF.fetch(`${ORIGIN}/api/auth/organization/set-active`, {
      method: "POST",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/json",
        Origin: ORIGIN,
      },
      body: JSON.stringify({ organizationSlug: orgB.orgSlug }),
    });
    const inB = await SELF.fetch(`${ORIGIN}/api/protected/catalog/products`, {
      headers: { Cookie: cookie },
    });
    const productsA = (await inA.json()) as { data: { sku: string }[] };
    const productsB = (await inB.json()) as { data: { sku: string }[] };
    expect(productsA.data.some((p) => p.sku === "ESC-001")).toBe(true);
    expect(productsB.data.some((p) => p.sku === "ESC-001")).toBe(false);
  });

  it("membership loss returns 403", async () => {
    const session = await createTestSessionWithOrg({ orgName: "Leave Org" });
    const { accessToken } = await mintMcpAccessToken({
      cookie: session.cookie,
      organizationId: session.orgId,
    });

    await env.DB.prepare("DELETE FROM member WHERE user_id = ?")
      .bind(session.userId)
      .run();

    const res = await mcpRpc(accessToken, {
      jsonrpc: "2.0",
      id: 4,
      method: "tools/list",
      params: {},
    });
    expect(res.status).toBe(403);
  });

  it("revoke 403s that grant and leaves another org's grant intact", async () => {
    const userA = await createTestSessionWithOrg({ orgName: "Revoke A" });
    const userB = await createTestSessionWithOrg({ orgName: "Keep B" });
    const mintedA = await mintMcpAccessToken({
      cookie: userA.cookie,
      organizationId: userA.orgId,
    });
    const mintedB = await mintMcpAccessToken({
      cookie: userB.cookie,
      organizationId: userB.orgId,
    });

    const revoke = await SELF.fetch(
      `${ORIGIN}/api/protected/mcp/connections/revoke`,
      {
        method: "POST",
        headers: {
          Cookie: userA.cookie,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ clientId: mintedA.clientId }),
      }
    );
    expect(revoke.status).toBe(200);

    const afterA = await mcpRpc(mintedA.accessToken, {
      jsonrpc: "2.0",
      id: 5,
      method: "tools/list",
      params: {},
    });
    expect(afterA.status).toBe(403);

    const afterB = await mcpRpc(mintedB.accessToken, {
      jsonrpc: "2.0",
      id: 6,
      method: "tools/list",
      params: {},
    });
    expect(afterB.status).toBe(200);
    const bodyB = (await readMcpJson(afterB)) as {
      result?: { tools?: unknown[] };
    };
    expect(bodyB.result?.tools?.length).toBeGreaterThan(0);
  });
});
