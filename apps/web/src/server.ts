import handler from "@tanstack/react-start/server-entry";
import { auth } from "@workspace/auth";
import { getAgentByName, routeAgentRequest } from "agents";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { app as honoApp } from "./hono";

export { OrgAgent } from "@workspace/agent/org";
// OrgChat and OrgSubAgent are facets (sub-agents) of OrgAgent, resolved by the
// framework via these named worker exports — they need no wrangler binding or
// migration (they share OrgAgent's storage). OrgSubAgent is a facet under
// OrgChat, spawned by the `delegate` agent tool.
export { OrgChat, OrgSubAgent } from "@workspace/agent/org/chat";

const app = new Hono()
  .use("*", logger())
  .use("*", cors())
  .route("/api", honoApp)
  .all("*", (c) => handler.fetch(c.req.raw));

const ORG_AGENT_PATH_RE = /^\/agents\/org-agent\/([^/]+)/;

function gateOrgAgent(pathname: string, activeOrgId: string): Response | null {
  const rawId = pathname.match(ORG_AGENT_PATH_RE)?.[1];
  if (!rawId) {
    return new Response("Not found", { status: 404 });
  }
  const organizationId = decodeURIComponent(rawId);
  if (organizationId !== activeOrgId) {
    return new Response("Not found", { status: 404 });
  }
  return null;
}

export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/agents/")) {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session?.user) {
        return new Response("Unauthorized", { status: 401 });
      }
      const activeOrgId = session.session.activeOrganizationId;
      if (!activeOrgId) {
        return new Response("No active organization", { status: 403 });
      }

      if (url.pathname.startsWith("/agents/org-agent/")) {
        const gateFailure = gateOrgAgent(url.pathname, activeOrgId);
        if (gateFailure) {
          return gateFailure;
        }
        // Same bootstrap the Think assistant example uses before routing:
        // `getAgentByName` → partyserver `getServerByName` / set-name, which
        // persists `__ps_name` so `this.name` works on WebSocket hibernation
        // and alarm wakes when local workerd does not yet propagate
        // `ctx.id.name` (compat date capped below 2026-03-15 under vite dev).
        // Multi-session shape is unchanged: OrgAgent parent (shared workspace)
        // + OrgChat facets (one window per chat) via client `sub:`.
        await getAgentByName(
          env.OrgAgent as unknown as Parameters<typeof getAgentByName>[0],
          activeOrgId
        );
      }

      const agentResponse = await routeAgentRequest(request, env);
      if (agentResponse) {
        return agentResponse;
      }
    }

    return app.fetch(request, env, ctx);
  },
};
