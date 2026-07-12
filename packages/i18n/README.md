# @workspace/i18n

App message catalogs for Paraglide (EN source of truth + target locales).

```
packages/i18n/
  messages/en.json          # source of truth
  messages/es.json          # Spanish target
  glossary/es.md            # tone + preferred terms
  .i18n-lock.json           # EN value hashes (incremental retranslate)
  project.inlang/           # Paraglide / inlang project
  scripts/sync.mjs           # stub missing target keys
  scripts/lint.mjs           # coverage + placeholder parity
```

## Commands (from monorepo root)

| Command | Purpose |
|---|---|
| `pnpm i18n:sync` | Ensure every EN key exists in each target (empty stub if missing); refresh lock hashes for filled keys |
| `pnpm i18n:lint` | Fail on missing/empty targets or placeholder mismatch |
| `pnpm i18n:lint -- --json` | Machine-readable `{ gaps, warnings }` for agents |

Compile/runtime lives in `apps/web` (Vite plugin → `apps/web/src/paraglide`). See `docs/guides/i18n.md`.
