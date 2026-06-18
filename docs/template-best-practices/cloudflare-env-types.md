# Cloudflare env types via `cf-typegen`

**Do not hand-edit** `packages/cloudflare-env/src/env.d.ts`. That file is generated from `apps/web-tanstack/wrangler.jsonc`.

## When to run it

Run `cf-typegen` whenever you change Worker bindings in `wrangler.jsonc`:

- D1, R2, KV, Durable Objects, Workflows
- `worker_loaders` (e.g. codemode `LOADER`)
- `vars` (non-secret config declared in wrangler)

From the monorepo root:

```bash
pnpm --filter web-tanstack cf-typegen
```

Or from the app:

```bash
cd apps/web-tanstack && pnpm cf-typegen
```

## What it produces

The script runs three steps (defined in `apps/web-tanstack/package.json`):

1. **`wrangler types`** — writes full runtime types to `apps/web-tanstack/worker-configuration.d.ts` (app-local, includes typed DO class imports).
2. **`wrangler types ../../packages/cloudflare-env/src/env.d.ts --include-runtime=false`** — writes a portable env-only stub into `@workspace/cloudflare-env` for shared packages (`db-d1`, `auth`, `core`, etc.).
3. **`packages/cloudflare-env/scripts/postprocess-env.mjs`** — strips artifacts that break cross-package type-checking:
   - `interface GlobalProps` (references the worker entry module)
   - `DurableObjectNamespace<import("...")>` → bare `DurableObjectNamespace`
   - Parameterized `Workflow<...>` → bare `Workflow` (when Workflows bindings exist)

## Rules

| Do | Don't |
|----|-------|
| Add or change bindings in `wrangler.jsonc`, then run `cf-typegen` | Edit `packages/cloudflare-env/src/env.d.ts` by hand |
| Commit the generated files after binding changes | Duplicate env types in package source files |
| Extend `postprocess-env.mjs` if wrangler adds new cross-package leakage | Revert to inline `node -e` snippets in `package.json` |

If postprocess needs a new strip rule, add it to `postprocess-env.mjs` with a short comment — same pattern as the main sfab platform repo (`packages/cloudflare-env/scripts/postprocess-env.mjs`).

## Two-file model

| File | Consumers | Contents |
|------|-----------|----------|
| `apps/web-tanstack/worker-configuration.d.ts` | App (`web-tanstack`) only | Full runtime types + typed DO namespaces |
| `packages/cloudflare-env/src/env.d.ts` | Shared packages via tsconfig `include` | Portable `Cloudflare.Env` bindings only |

Shared packages import `env` from `cloudflare:workers` and rely on the shared `Cloudflare.Env` ambient types. The app gets stronger typing from its local worker config.

## Secrets and `.dev.vars`

**Do not add secrets to `wrangler.jsonc` `vars`.** Declare them in `apps/web-tanstack/.dev.vars` (see `.dev.vars.example`). Wrangler loads `.dev.vars` automatically during local dev; production values are set with `wrangler secret put <NAME>`.

After adding or changing variables in `.dev.vars`, regenerate types:

```bash
pnpm --filter web-tanstack cf-typegen
```

`wrangler types` reads bindings from `wrangler.jsonc` and picks up secret names from `.dev.vars` so shared packages (`auth`, `email`, etc.) get typed `env.*` accessors in `packages/cloudflare-env/src/env.d.ts`.

## Related docs

- [ADR-004: Shared Cloudflare Environment Types](../decisions/004-shared-cloudflare-env-types.md) — architectural decision for `@workspace/cloudflare-env` and the singleton pattern
