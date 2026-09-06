# MCP pack — install skill (ephemeral)

One-shot graft after
`pnpm dlx shadcn@4.20.1 add sfab-oss/sfab-starter/mcp#<ref> --yes -c apps/web`.
Then delete this file. Later agents use `docs/guides/mcp.md`, not this skill.
Cursor as a client is told by Settings (URL + JSON), not by `AGENTS.md`.

Do not move `packages/agent/src/tool-parts/`. Do not add CIMD. Do not create
`packages/mcp`.

## 1. Confirm file drops

Files exist at repo-root destinations, not as the `~/…` strings in
`registry.json`. Check `packages/db/src/schema/oauth.ts`,
`apps/web/src/mcp/index.ts`, `apps/web/src/routes/mcp.consent.tsx`, `skill.md`.
Fragments `packages/i18n/messages/mcp-en.json` and `mcp-es.json` are temporary:
merge them in step 6, then delete those two files.

The pack copies `oauth.ts` only. It does not drop drizzle SQL, a snapshot, or
`_journal.json`. You generate and migrate in step 5.

## 2. Package exports and deps

Keep versions pinned to the project's current `better-auth` line.

`packages/auth/package.json`:

- dependency `@better-auth/mcp` (same version as `better-auth`)
- export `"./mcp-resource": "./src/mcp-resource.ts"`

`packages/contract/package.json`:

- export `"./mcp-connections": "./src/mcp-connections.ts"`

`packages/agent/package.json`:

- export `"./mcp": "./src/mcp/compose-mcp-tools.ts"`
- dependency `@modelcontextprotocol/server` if missing

`packages/core` already maps `./mcp` via `"./*": "./src/*.ts"`.

`packages/db/src/schema/index.ts`:

```ts
export * from "./oauth";
```

## 3. Auth plugins

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

## 4. HTTP intercept and routes

`apps/web/src/server.ts` and `apps/web/src/workerd-test/worker-entry.ts`: call
`dispatchMcpRequest` **before** Hono / TanStack. If it returns a Response, return
it.

`apps/web/src/hono/index.ts`:

- force `prompt=consent` on `/oauth2/authorize` when the client omitted it
- `.get("/mcp/consent-client", …)` and `.post("/mcp/consent", …)` from
  `../mcp/consent-handler`

`apps/web/src/hono/org-protected/index.ts`: `.route("/mcp", mcpRoutes)`.

`apps/web/src/routes/_protected/settings/route.tsx`: nav item `{ to: "/settings/mcp", label: m.settings_mcp() }`.

## 5. Drizzle

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

## 6. i18n

Merge `mcp-en.json` / `mcp-es.json` keys into `packages/i18n/messages/en.json`
and `es.json` (do not replace the catalogs). Delete the two fragment files.
`pnpm i18n:sync && pnpm i18n:lint`.

## 7. Durable use docs

`docs/guides/mcp.md` should already be present from the pack drop. Add one
index line to `AGENTS.md` **and** the byte-identical `.claude/CLAUDE.md`:

```
MCP OAuth server → [`docs/guides/mcp.md`](docs/guides/mcp.md) + skill `.agents/skills/mcp`.
```

List `mcp` in the `.agents/skills/` index. Symlink
`.claude/skills/mcp` → `../../.agents/skills/mcp` if `.claude/skills` uses that
layout.

## 8. Provenance, then delete this file

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

Then **delete this `skill.md`**.
