# ADR-003: Cloudflare D1 Migrations in Monorepo

**Status:** Accepted
**Date:** 2026-02-26
**Authors:** Team

## Context

We needed to establish a migration strategy for Cloudflare D1 databases in our monorepo that:

- Supports a shared schema package (`@workspace/db-d1`) consumed by multiple apps
- Works for both local development (zero credentials) and production (Cloudflare remote)
- Follows Cloudflare and Drizzle best practices
- Enables Drizzle Studio for local database inspection
- Maintains single source of truth for migrations

Key constraints:
- Drizzle Kit generates migrations but doesn't apply them for D1
- Cloudflare recommends `wrangler d1 migrations apply` for applying migrations
- `wrangler.jsonc` can point `migrations_dir` to any directory in the repo
- Local D1 creates SQLite files in `.wrangler/state/v3/d1/`

## Decision

> We will use a minimal Drizzle Kit config for generation (offline) and wrangler for applying migrations, with migrations stored in the shared `@workspace/db-d1` package.

### Core Principles

1. **Drizzle Kit = generate only** - No live DB connection needed for `db:generate`
2. **Wrangler = apply migrations** - Uses `_d1_migrations` table to track state
3. **Shared migrations** - `migrations_dir` in wrangler.jsonc points to package
4. **No env vars for local** - Zero credentials needed for local development
5. **Factory pattern for DB client** - `createDb(d1)` for flexibility

## Options Considered

### Option 1: d1-http Driver for Everything (Rejected)

**Description:** Use `d1-http` driver in drizzle.config.ts for both generate and studio

**Pros:**
- Single config file
- Works for remote operations

**Cons:**
- Requires env vars even for local development
- `db:generate` doesn't need a live connection
- More complex setup for new developers
- Credentials needed for simple schema changes

### Option 2: Auto-Detect Local SQLite for Everything (Rejected)

**Description:** Single config that auto-detects `.sqlite` file for both generate and studio

**Pros:**
- No env vars for local
- Single config file

**Cons:**
- `db:generate` shouldn't need any DB connection
- Adds unnecessary complexity to generation step
- Mixing concerns (generation vs inspection)

### Option 3: Two Separate Configs (Accepted)

**Description:** Minimal config for generation, separate config with auto-detect for studio

**Pros:**
- `db:generate` works 100% offline
- No env vars needed for local development
- Clear separation of concerns
- Follows official recommendations
- Drizzle Studio works seamlessly

**Cons:**
- Two config files to maintain
- Slightly more complex package structure

### Option 4: Direct cloudflare:workers Import in Package (Adopted — Feb 2026)

**Description:** Import `env` from `cloudflare:workers` directly in `@workspace/db-d1` and `@workspace/auth`.

**Pros:**
- Simplest import pattern — `import { db } from "@workspace/db-d1"` everywhere
- No factory function or wiring files needed
- Shared packages (`core`, AI tools, etc.) get direct db/auth access without DI

**Cons:**
- Packages are tightly coupled to Cloudflare Workers runtime
- Drizzle Studio uses a separate config (`drizzle.config.local.ts`) that doesn't depend on the package singleton

**Why we changed our mind:** As the service layer (`packages/core`) grows with inventory management, AI tools, etc., the DI pattern required a wiring file for every new consumer. Since this project is fully committed to Cloudflare Workers, the coupling trade-off is acceptable. A shared `@workspace/cloudflare-env` package provides typed env declarations auto-generated from `wrangler.jsonc` via `wrangler types --include-runtime=false`.

## Consequences

### Positive

- **Zero credentials for local dev** - New developers can run `pnpm db:migrate` immediately
- **Offline migration generation** - `pnpm db:generate` works without any DB connection
- **Single source of truth** - Schema and migrations live in shared package
- **Drizzle Studio works** - Can inspect local database visually
- **Wrangler tracks state** - `_d1_migrations` table prevents double-applies
- **Works in CI/CD** - Same scripts work everywhere, just different `--local`/`--remote` flag

### Negative

- **Two config files** - `drizzle.config.ts` and `drizzle.config.local.ts`
- **Workers-only packages** - `db-d1` and `auth` packages are coupled to Cloudflare Workers runtime
- **better-sqlite3 dependency** - Native module required for Drizzle Studio

### Neutral

- Requires `better-sqlite3` to be built (added to `pnpm.onlyBuiltDependencies`)
- Scripts run from root via `pnpm --filter`

## Implementation Notes

### Package Structure

```
packages/db-d1/
├── src/
│   ├── index.ts              # createDb factory + schema re-exports
│   └── schema/
│       └── todo.ts
├── drizzle/                   # Generated migrations (committed)
├── drizzle.config.ts          # Minimal (for generate, no driver)
├── drizzle.config.local.ts    # Auto-detect .sqlite (for studio)
├── seed.sql                   # Optional seed data
└── package.json
```

### App Structure

```
apps/web-tanstack/
├── wrangler.jsonc             # migrations_dir points to package, source of truth for bindings
├── .wrangler/state/v3/d1/     # Local SQLite (gitignored)
└── package.json               # cf-typegen generates env types into cloudflare-env package
```

### Key Files

**drizzle.config.ts** (minimal, offline):
```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema/*",
  out: "./drizzle",
  dialect: "sqlite",
});
```

**drizzle.config.local.ts** (auto-detect for studio):
```typescript
import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "drizzle-kit";

function getLocalD1DB(): string {
  const basePath = path.resolve(__dirname, "../../apps/web-tanstack/.wrangler/state/v3/d1");
  try {
    const files = fs.readdirSync(basePath, { recursive: true, encoding: "utf-8" });
    const dbFile = files.find((f) => typeof f === "string" && f.endsWith(".sqlite"));
    if (dbFile) return path.resolve(basePath, dbFile);
  } catch { /* Directory doesn't exist */ }
  return ":memory:";
}

export default defineConfig({
  schema: "./src/schema/*",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: { url: getLocalD1DB() },
});
```

**packages/db-d1/src/index.ts** (singleton in package):
```typescript
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export const db = drizzle(env.DB, { schema });
export type Db = typeof db;
```

**wrangler.jsonc** (migrations in package):
```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "web-tanstack-db",
      "database_id": "...",
      "migrations_dir": "../../packages/db-d1/drizzle"
    }
  ]
}
```

### Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `db:generate` | `pnpm --filter @workspace/db-d1 db:generate` | Generate .sql from schema (offline) |
| `db:studio` | `pnpm --filter @workspace/db-d1 db:studio` | Open Drizzle Studio |
| `db:migrate` | `pnpm --filter web-tanstack db:migrate` | Apply to local D1 |
| `db:migrate:prod` | `pnpm --filter web-tanstack db:migrate:prod` | Apply to remote D1 |
| `db:seed` | `pnpm --filter web-tanstack db:seed` | Seed local |
| `db:reset` | `pnpm --filter web-tanstack db:reset` | Wipe + migrate + seed |

### Workflow

**Local Development:**
```bash
# 1. Modify schema in packages/db-d1/src/schema/
# 2. Generate migration (works offline)
pnpm db:generate

# 3. Apply to local D1
pnpm db:migrate

# 4. Optional: Inspect in Drizzle Studio
pnpm db:studio
```

**Production:**
```bash
# 1. Generate migration (if schema changed)
pnpm db:generate

# 2. Apply to production
pnpm db:migrate:prod

# 3. Deploy
pnpm --filter web-tanstack deploy
```

## Related Decisions

- ADR-001: Monorepo Structure - Establishes `packages/` and `apps/` structure
- Future ADR: Authentication integration with D1

## References

- [Cloudflare D1 Migrations](https://developers.cloudflare.com/d1/learning/migrations/)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/connect-cloudflare-d1)
- [Wrangler D1 Commands](https://developers.cloudflare.com/workers/wrangler/commands/#d1)
- [Drizzle Kit Config](https://orm.drizzle.team/docs/drizzle-config-file)
