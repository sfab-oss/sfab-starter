# MCP OAuth server

How the **opt-in `mcp` pack** exposes a Streamable HTTP MCP endpoint at `/mcp`,
bound to one organization per OAuth grant. The base template and a newly
fabricated project (minus `apps/docs` and `packages/registry`) do **not**
include MCP HTTP, OAuth plugins, consent, or Settings MCP until install.

Install: `shadcn add sfab-oss/sfab-starter/mcp#<ref>`, then run the copied
`skill.md` (wire barrels, write `.sfab/template.json`
`packs.mcp = { ref, installedAt }`, delete the skill). Cursor as a client is
configured from Settings (URL + JSON snippet), not from `AGENTS.md`.

Pack source in this repo: `packages/registry/registry/packs/mcp/`.

## The question

An MCP client (Cursor, or any OAuth DCR client) needs to call tools against
the signed-in user's organization without picking `organizationId` itself, and
without a shared PAT.

## Preferred pattern

Same-Worker intercept: after install, `dispatchMcpRequest` in
`apps/web/src/server.ts` runs before Hono/TanStack. GET `/mcp` is 405 (Allow
POST, OPTIONS). POST requires a JWT whose audience is `{origin}/mcp`, verified
in-process against the JWKS table. The grant table binds
`(clientId, userId) → organizationId`. Tools import execute functions from
`packages/agent/src/tool-parts/` and never take an org id.

Dynamic Client Registration is on. CIMD is off.

### Origin and host

`BETTER_AUTH_URL` is the allowed Origin. `localhost` and `127.0.0.1` are
different origins. Sign in and call `/mcp` from the same host the env uses
(typically `http://localhost:3000`). A missing Origin is 401; a foreign Origin
is 403.

### Local D1 after a rewritten 0003

Migration `0003_white_the_fury.sql` owns JWKS, OAuth, and
`mcp_organization_grant`. If an older local D1 still has a grant FK to
`oauth_resource.id`, DCR returns 500 until `pnpm db:reset`.

### Tool catalog

Twelve reads plus `create_product` and `update_product`. No `delete_product`,
no `display_*`. Names:
`packages/registry/registry/packs/mcp/tools/mcp-tool-names.ts` (installs to
`packages/agent/src/mcp/mcp-tool-names.ts`).

## Files of Interest

Pack paths are the source of truth in this template. After install they land
on the `registry.json` `target` paths.

- `packages/registry/registry/packs/mcp/db/schema/oauth.ts` — `jwks`, OAuth tables, `mcpOrganizationGrant`
- `packages/registry/registry/packs/mcp/auth/mcp-resource.ts` — issuer `{origin}/api/auth`, resource `{origin}/mcp`
- `packages/registry/registry/packs/mcp/skill.md` — graft: auth plugins, intercept, nav, i18n, provenance, self-delete
- `packages/registry/registry/packs/mcp/tools/compose-mcp-tools.ts` — binder over tool-parts
- `packages/registry/registry/packs/mcp/server/mcp/index.ts` — Streamable HTTP handler + well-known resource
- `packages/registry/registry/packs/mcp/test/mcp.workerd.test.ts` — GET 405, JWT POST, grant, revoke, Origin

Do not move `packages/agent/src/tool-parts/` into the pack.
