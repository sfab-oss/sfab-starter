# MCP OAuth server

How this repo exposes a Streamable HTTP MCP endpoint at `/mcp`, bound to one
organization per OAuth grant. The capability is an opt-in pack
(`packages/registry/registry/packs/mcp/`). This tree currently still *is* the
installed tree so workerd tests can prove it. Cursor as a client is configured
from Settings (URL + JSON snippet), not from `AGENTS.md`.

## The question

An MCP client (Cursor, or any OAuth DCR client) needs to call tools against
the signed-in user's organization without picking `organizationId` itself, and
without a shared PAT.

## Preferred pattern

Same-Worker intercept: `dispatchMcpRequest` in `apps/web/src/server.ts` runs
before Hono/TanStack. GET `/mcp` is 405 (Allow POST, OPTIONS). POST requires a
JWT whose audience is `{origin}/mcp`, verified in-process against the JWKS
table. The grant table binds `(clientId, userId) → organizationId`. Tools
import execute functions from `packages/agent/src/tool-parts/` and never take
an org id.

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
no `display_*`. Names: `packages/agent/src/mcp/mcp-tool-names.ts`.

## Files of Interest

- `packages/db/src/schema/oauth.ts:16` — `jwks`, OAuth tables, `mcpOrganizationGrant`
- `packages/db/drizzle/0003_white_the_fury.sql:1` — SQL for those tables
- `packages/auth/src/mcp-resource.ts:10` — issuer `{origin}/api/auth`, resource `{origin}/mcp`
- `packages/auth/src/index.ts:55` — `jwt()` + `mcp({ loginPage, consentPage, resource, DCR })`
- `packages/core/src/mcp.ts` — grant bind / list / revoke
- `packages/agent/src/mcp/compose-mcp-tools.ts:78` — binder over tool-parts
- `packages/agent/src/mcp/mcp-tool-names.ts:1` — published tool names
- `apps/web/src/mcp/index.ts` — Streamable HTTP handler + well-known resource
- `apps/web/src/mcp/check-mcp-origin.ts:10` — Origin gate
- `apps/web/src/server.ts:43` — intercept before the rest of the Worker
- `apps/web/src/hono/index.ts:37` — consent routes + authorize `prompt=consent`
- `apps/web/src/hono/org-protected/mcp.ts` — Settings list/revoke API
- `apps/web/src/routes/mcp.consent.tsx` — consent UI (client display name, hide protocol scopes)
- `apps/web/src/routes/_protected/settings/mcp.tsx` — Settings page
- `apps/web/test/api/mcp.workerd.test.ts` — GET 405, JWT POST, grant, revoke, Origin

## Install (pack)

`shadcn add sfab-oss/sfab-starter/mcp#<ref>`, then run the copied `skill.md`
(wire barrels, write `.sfab/template.json` `packs.mcp = { ref, installedAt }`,
delete the skill). Do not leave `skill.md` in the project.
