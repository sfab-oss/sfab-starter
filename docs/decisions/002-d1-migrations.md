# ADR-002: Cloudflare D1 Migrations in the Monorepo

**Status:** Accepted
**Date:** 2026-06-18 (supersedes the 2026-02-26 record; renumbered + rename-corrected)
**Authors:** Team

## Context

We need a migration strategy for Cloudflare D1 that:

- Keeps schema + migrations in the shared `@workspace/db` package (one source of
  truth, consumed by every layer).
- Works for both local development (zero credentials) and production (remote).
- Follows Cloudflare + Drizzle guidance.
- Supports Drizzle Studio for local inspection.

Key constraints: Drizzle Kit *generates* migrations but doesn't *apply* them for
D1; Cloudflare applies them via `wrangler d1 migrations apply` (tracked in the
`_d1_migrations` table); `wrangler.jsonc`'s `migrations_dir` can point at any
directory in the repo; local D1 lives in `.wrangler/state/v3/d1/`.

## Decision

> **Drizzle Kit generates (offline); Wrangler applies.** Migrations live in
> `packages/db/drizzle/`, pointed to from the app's `wrangler.jsonc`. Generation
> needs no DB connection and no env vars; applying is one wrangler command,
> local or remote.

### Core principles

1. **Drizzle Kit = generate only** — `db:generate` needs no live connection.
2. **Wrangler = apply** — `_d1_migrations` tracks state, preventing double-applies.
3. **Shared migrations** — `migrations_dir` → `../../packages/db/drizzle`.
4. **Zero credentials for local** — new developers run `pnpm db:migrate` immediately.
5. The `db` client is a singleton, not a factory — see
   [ADR-003](./003-cloudflare-env-and-db-singleton.md).

## Options Considered

### Two configs: minimal generate + auto-detect studio (chosen)

A minimal `drizzle.config.ts` (no driver) for generation, plus a
`drizzle.config.local.ts` that auto-detects the local `.sqlite` for Studio.

- **For:** `db:generate` is 100% offline; no env vars for local dev; clear
  separation of concerns; Studio works; matches official guidance.
- **Against:** two config files to maintain.

### `d1-http` driver for everything (rejected)

- **Against:** requires env vars even for local; generation shouldn't need a live
  connection; more setup for newcomers.

### Single auto-detect config for everything (rejected)

- **Against:** mixes generation and inspection concerns; `db:generate` shouldn't
  touch a DB at all.

## Consequences

### Positive

- Zero-credential local dev; offline generation; single source of truth for
  schema + migrations; Studio works; same scripts in CI (just `--local`/`--remote`).

### Negative

- Two Drizzle config files.
- `better-sqlite3` native module required for Studio (added to
  `pnpm.onlyBuiltDependencies`).

### Operational caution

D1 runs each migration inside an implicit transaction, so `PRAGMA
foreign_keys=OFF` is a **no-op** — a destructive table-recreate can fire inbound
FK cascades in production while passing locally. Prefer additive,
backward-compatible (expand/contract) migrations; if a recreate is unavoidable,
use `PRAGMA defer_foreign_keys=true`. Never rewrite an already-applied migration
— fixes are forward-only. This is enforced by a CI guard — see
[ADR-007](./007-d1-drizzle-table-recreate-fk-cascades.md) for the full rationale
(`apps/web/test/migration-safety.test.ts`), and `docs/guides/` for the
data-layer house style.

## Implementation Notes

### Package & app shape

```
packages/db/
├── src/schema/<cap>.ts        # one schema file per capability
├── drizzle/                   # generated migrations (committed)
├── drizzle.config.ts          # minimal — generate, no driver
└── drizzle.config.local.ts    # auto-detect .sqlite — studio

apps/web/wrangler.jsonc        # migrations_dir → ../../packages/db/drizzle
```

### `wrangler.jsonc` (migrations in package)

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "web-db",
      "migrations_dir": "../../packages/db/drizzle"
    }
  ]
}
```

### Scripts (run from root)

| Script | Purpose |
|---|---|
| `pnpm db:generate` | Generate `.sql` from schema (offline) |
| `pnpm db:migrate` | Apply to local D1 |
| `pnpm db:migrate:prod` | Apply to remote D1 |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm db:reset` | Wipe + migrate + seed (local) |

## Related Decisions

- [ADR-001](./001-monorepo-and-architecture.md) — establishes the `db` layer.
- [ADR-003](./003-cloudflare-env-and-db-singleton.md) — the `db` singleton + env.

## References

- [Cloudflare D1 Migrations](https://developers.cloudflare.com/d1/reference/migrations/)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/connect-cloudflare-d1)
- [D1 foreign keys](https://developers.cloudflare.com/d1/sql-api/foreign-keys/)
