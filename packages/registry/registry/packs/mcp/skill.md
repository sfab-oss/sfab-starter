# MCP pack — install skill (ephemeral)

One-shot graft after
`pnpm dlx shadcn@4.20.1 add sfab-oss/sfab-starter/mcp#<ref> --yes -c apps/web`.
This file lands at `apps/web/src/_pack/mcp/skill.md`. Run it, then it deletes
the staging dir. Later agents use `docs/guides/mcp.md`, not this skill.
Cursor as a client is told by Settings (URL + JSON), not by `AGENTS.md`.

Do not move `packages/agent/src/tool-parts/`. Do not add CIMD. Do not create
`packages/mcp`. Do not leave OAuth schema under `apps/web`.

## 1. Move staged files out of `apps/web/src/_pack/mcp/`

`shadcn add` can only write inside `apps/web`. Layer slices are staged here.
Move them, then the rest of this skill runs against the real paths.

| From (`apps/web/src/_pack/mcp/`) | To |
| --- | --- |
| `db/schema/oauth.ts` | `packages/db/src/schema/oauth.ts` |
| `contract/mcp-connections.ts` | `packages/contract/src/mcp-connections.ts` |
| `core/mcp.ts` | `packages/core/src/mcp.ts` |
| `auth/mcp-resource.ts` | `packages/auth/src/mcp-resource.ts` |
| `auth/mcp-resource.test.ts` | `packages/auth/src/mcp-resource.test.ts` |
| `agent/mcp-tool.ts` | `packages/agent/src/mcp/mcp-tool.ts` |
| `agent/mcp-tool-names.ts` | `packages/agent/src/mcp/mcp-tool-names.ts` |
| `agent/register-mcp-tools.ts` | `packages/agent/src/mcp/register-mcp-tools.ts` |
| `agent/register-mcp-tools.test.ts` | `packages/agent/src/mcp/register-mcp-tools.test.ts` |
| `i18n/en.json` | `packages/i18n/messages/mcp-en.json` |
| `i18n/es.json` | `packages/i18n/messages/mcp-es.json` |

Leave `skill.md` in the staging dir until the last step. Confirm
`apps/web/src/mcp/index.ts` and `apps/web/src/routes/mcp.consent.tsx` already
landed (those are not staged).

The pack copies `oauth.ts` only. It does not drop drizzle SQL, a snapshot, or
`_journal.json`. You generate and migrate in step 6.

## 2. Reconcile the MCP catalog

The dropped `register-mcp-tools.ts` is a frozen binder. This app's
`packages/agent/src/tool-parts/` is the live set. After the move, rewrite
the binder to match this repo. Do not copy `tool-parts/` into the pack.
Do not loop `getOrgAgentTools` onto `/mcp`. Keep `mcpTool` as-is.

Diff `packages/agent/src/tool-parts/` and `getOrgAgentTools` in
`packages/agent/src/in-app/compose-org-tools.ts` against
`packages/agent/src/mcp/register-mcp-tools.ts`:

- Bind every MCP-safe tool that exists here: named pieces already in
  `tool-parts/`, no `organizationId` in the tool input (org comes from the
  grant), no `delete_*`, no `display_*`.
- Drop binds whose modules are gone (imports that do not resolve).
- Rewrite `MCP_TOOL_NAMES` in `packages/agent/src/mcp/mcp-tool-names.ts` to
  match the binds, in bind order.
- Update `packages/agent/src/mcp/register-mcp-tools.test.ts` and
  `apps/web/test/api/mcp.workerd.test.ts` `tools/list` expectations.

Tools added after this install: `docs/guides/writing-agent-tools.md`.

## 3. Package exports and deps

Keep versions pinned to the project's current `better-auth` line.

`packages/auth/package.json`:

- dependency `@better-auth/mcp` (same version as `better-auth`)
- dependency `@better-auth/oauth-provider` (same version as `better-auth`)
- export `"./mcp-resource": "./src/mcp-resource.ts"`

`packages/contract/package.json`:

- export `"./mcp-connections": "./src/mcp-connections.ts"`

`packages/agent/package.json`:

- export `"./mcp": "./src/mcp/register-mcp-tools.ts"`
- dependency `@modelcontextprotocol/server` if missing

`apps/web/package.json`:

- dependency `@modelcontextprotocol/server` (same version as agent).
  `src/mcp/index.ts` imports `McpServer` from it.

`packages/core` already maps `./mcp` via `"./*": "./src/*.ts"`.

`packages/db/src/schema/index.ts`:

```ts
export * from "./oauth";
```

## 4. Auth plugins

In `packages/auth/src/index.ts`:

- import `{ mcp } from "@better-auth/mcp"`
- import `{ oauthProviderAuthServerMetadata } from "@better-auth/oauth-provider"`
- import `{ authOrigin, defaultMcpResource, mcpIssuer, mcpResource } from "./mcp-resource"`
- `jwt({ disableSettingJwtHeader: true, jwt: { issuer }, jwks: { keyPairConfig: { alg: "EdDSA", crv: "Ed25519" } } })`
- `mcp({ loginPage: "/login", consentPage: "/mcp/consent", resource, allowDynamicClientRegistration: true, allowUnauthenticatedClientRegistration: true })`
- before-hook: `defaultMcpResource(ctx.path, ctx.body, resource)`
- export `serveMcpAuthServerMetadata = oauthProviderAuthServerMetadata(auth)`
- export `{ verifyJwsAccessToken } from "better-auth/oauth2"`

DCR stays on. No CIMD.

## 5. HTTP intercept and routes

`apps/web/src/server.ts` and `apps/web/src/workerd-test/worker-entry.ts`: call
`dispatchMcpRequest` **before** Hono / TanStack. If it returns a Response, return
it.

`apps/web/src/hono/index.ts`:

- force `prompt=consent` on `/oauth2/authorize` when the client omitted it
- `.get("/mcp/consent-client", …)` and `.post("/mcp/consent", …)` from
  `../mcp/consent-handler`

`apps/web/src/hono/org-protected/index.ts`: `.route("/mcp", mcpRoutes)`.

`apps/web/src/routes/_protected/settings/route.tsx`: nav item `{ to: "/settings/mcp", label: m.settings_mcp() }`.

Then `pnpm --filter web generate-routes` so `routeTree.gen.ts` includes
`/mcp/consent` and `/settings/mcp`.

## 6. Drizzle

You own the schema journal. After `oauth.ts` is exported from
`packages/db/src/schema/index.ts`:

```
pnpm db:generate
pnpm db:migrate
```

Do not append `_journal.json` by hand. Do not copy a numbered SQL file into
`packages/db/drizzle/`. Generate writes the next migration and journal entry;
migrate applies it.

If DCR returns 500 because a local D1 still has an older OAuth or grant
shape, `pnpm db:reset` (local only).

## 7. i18n

Merge `mcp-en.json` / `mcp-es.json` keys into `packages/i18n/messages/en.json`
and `es.json` (do not replace the catalogs). Delete the two fragment files.
`pnpm i18n:sync && pnpm i18n:lint`.

## 8. Durable use docs

`docs/guides/mcp.md` and `.agents/skills/mcp/SKILL.md` are already in a
fabricated tree (not copied by `add`). Add one index line to `AGENTS.md`
**and** the byte-identical `.claude/CLAUDE.md`:

```
MCP OAuth server → [`docs/guides/mcp.md`](docs/guides/mcp.md) + skill `.agents/skills/mcp`.
```

List `mcp` in the `.agents/skills/` index. Symlink
`.claude/skills/mcp` → `../../.agents/skills/mcp` if `.claude/skills` uses that
layout.

## 9. Provenance, then delete the staging dir

Write `packs.mcp = { ref, installedAt }` onto `.sfab/template.json`. `ref` is
the template SHA used in `shadcn add`. Never write `mode`. If
`packages/registry` is still in the tree:

```ts
import { writePackProvenance } from "@workspace/registry/pack-provenance";
writePackProvenance(".sfab/template.json", "mcp", {
  ref: "<template SHA>",
  installedAt: new Date().toISOString(),
});
```

Fabricated projects drop `packages/registry`. Write the same shape yourself:

```js
import { readFileSync, writeFileSync } from "node:fs";
const path = ".sfab/template.json";
const manifest = JSON.parse(readFileSync(path, "utf8"));
manifest.packs = { ...(manifest.packs ?? {}), mcp: { ref, installedAt } };
writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
```

Then **delete `apps/web/src/_pack/mcp/`** (this skill included). Do not leave
staged layer files under `apps/web`.

## 10. Verify (optional)

After migrate:

```
pnpm --filter web test -- test/api/mcp.workerd.test.ts
```

GET `/mcp` 405 only proves the intercept. That test covers JWT POST, grant,
revoke, and Origin.
