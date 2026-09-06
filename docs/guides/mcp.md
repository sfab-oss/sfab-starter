# MCP OAuth server

How the **opt-in `mcp` pack** exposes a Streamable HTTP MCP endpoint at `/mcp`,
bound to one organization per OAuth grant. The base template and a newly
fabricated project (minus `apps/docs` and `packages/registry`) do **not**
include MCP HTTP, OAuth plugins, consent, or Settings MCP until install.

Install from the repo root (CLI pin is `packages/ui` `shadcn@4.20.1`):

`pnpm dlx shadcn@4.20.1 add sfab-oss/sfab-starter/mcp#<ref> --yes -c apps/web`

Then run `apps/web/src/_pack/mcp/skill.md` (move staged layer files into
`packages/*`, wire barrels, write `.sfab/template.json`
`packs.mcp = { ref, installedAt }`, delete the staging dir). You own the schema
journal: `pnpm db:generate` then `pnpm db:migrate`. The pack does not drop
SQL or edit `_journal.json`. Cursor as a client is configured from Settings
(URL + JSON snippet), not from `AGENTS.md`.

In this template repo the pack source is
`packages/registry/registry/packs/mcp/`. A fabricated project drops
`packages/registry`. After add, files land under `apps/web` (`src/mcp/…`,
`src/_pack/mcp/…`). The skill moves staged files onto layer packages (for
example `packages/db/src/schema/oauth.ts`). The durable guide in a fabricated
tree is this file: `docs/guides/mcp.md`.

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

### Schema generation and migration

The pack copies `oauth.ts` (JWKS, OAuth tables, `mcp_organization_grant`). It
does not copy a numbered drizzle SQL file or edit `_journal.json`. After
install, generate the next migration and apply it:

```
pnpm db:generate
pnpm db:migrate
```

If a local D1 still has an older OAuth or grant shape and DCR returns 500,
`pnpm db:reset` (local only).

### Tool catalog

Twelve reads plus `create_product` and `update_product`. No `delete_product`,
no `display_*`. After install, names live at
`packages/agent/src/mcp/mcp-tool-names.ts`.

## Files of Interest

In this template repo, pack paths are the authoring source. A fabricated
project has no `packages/registry`. After install, use the `target` paths.

- `packages/registry/registry/packs/mcp/db/schema/oauth.ts` (add stages under `apps/web/src/_pack/mcp/`; skill moves to `packages/db/src/schema/oauth.ts`) — `jwks`, OAuth tables, `mcpOrganizationGrant`
- `packages/registry/registry/packs/mcp/auth/mcp-resource.ts` (same: stage then skill to `packages/auth/src/mcp-resource.ts`) — issuer `{origin}/api/auth`, resource `{origin}/mcp`
- `packages/registry/registry/packs/mcp/skill.md` (installs to `apps/web/src/_pack/mcp/skill.md`) — move staged files, graft, provenance, delete staging dir
- `packages/registry/registry/packs/mcp/tools/compose-mcp-tools.ts` (stage then skill to `packages/agent/src/mcp/compose-mcp-tools.ts`) — binder over tool-parts
- `packages/registry/registry/packs/mcp/server/mcp/index.ts` (installs to `apps/web/src/mcp/index.ts`) — Streamable HTTP handler + well-known resource
- `packages/registry/registry/packs/mcp/test/mcp.workerd.test.ts` (installs to `apps/web/test/api/mcp.workerd.test.ts`) — GET 405, JWT POST, grant, revoke, Origin

Do not move `packages/agent/src/tool-parts/` into the pack.
