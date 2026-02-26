# Environment Variables — Current State & Open Questions

This document describes how environment variables are currently handled across the monorepo.
It is intended as a starting point for an engineer to propose a better approach aligned with
Cloudflare Workers / Wrangler standards.

---

## Monorepo Overview

```
simple-monorepo-tanstack/
├── apps/
│   └── web-tanstack/       # The only app. TanStack Start on Cloudflare Workers.
├── packages/
│   ├── auth/               # Better Auth factory, consumes BETTER_AUTH_SECRET via T3 env
│   ├── config/             # Shared config, consumes AI keys + Vercel URLs via T3 env
│   ├── db-d1/              # Drizzle ORM for Cloudflare D1. No env access — D1 binding passed in.
│   ├── types/              # Shared TypeScript types. No env access.
│   ├── ui/                 # Shared React component library. No env access.
│   └── typescript-config/  # Shared tsconfig presets. No env access.
├── .env                    # Git-ignored. Currently only BETTER_AUTH_SECRET.
├── .env.example            # Committed template.
└── turbo.json
```

**Package manager:** pnpm workspaces  
**Build system:** Turborepo  
**Runtime target:** Cloudflare Workers (via Wrangler + `@cloudflare/vite-plugin`)

---

## The App: `apps/web-tanstack`

- Framework: TanStack Start (React 19 + Vite)
- Runtime: Cloudflare Workers
- Dev server: `vite dev --port 3001` using `@cloudflare/vite-plugin`
- Deploy: `wrangler deploy`

All secrets and bindings for this app are managed through Wrangler:

- **Locally:** `.dev.vars` file inside `apps/web-tanstack/` (git-ignored)
- **Production:** Cloudflare Worker secrets set via `wrangler secret put`

### Current `.dev.vars` contents

```
BETTER_AUTH_SECRET=<secret>
BETTER_AUTH_URL=http://localhost:3001
```

### Current `wrangler.jsonc` bindings

```jsonc
{
  "name": "web-tanstack",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "web-tanstack-db",
      "database_id": "placeholder-remote-db-id",
      "migrations_dir": "../../packages/db-d1/drizzle"
    }
  ]
  // vars block is commented out — no plain vars defined
}
```

The `DB` binding is a `D1Database` object (not a string). All secrets are string values
expected to be in `.dev.vars` locally and set as Worker secrets in production.

### How env is accessed in server code

```ts
// apps/web-tanstack/src/server/db.ts
import { env } from "cloudflare:workers";
export const db = createDb(env.DB, true);

// apps/web-tanstack/src/server/auth.ts
import { env } from "cloudflare:workers";
export const auth = createAuth(db, { baseURL: env.BETTER_AUTH_URL });
```

The `cloudflare:workers` module is the correct Cloudflare Workers API for accessing
bindings and secrets at runtime.

### Generated type bridge: `worker-configuration.d.ts`

Running `wrangler types` (the `cf-typegen` script) generates this file, which:

1. Declares `Cloudflare.Env` with all bindings (`DB`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`)
2. Extends `NodeJS.ProcessEnv` with the string-valued bindings

```ts
declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    BETTER_AUTH_SECRET: string;
    BETTER_AUTH_URL: string;
  }
}
declare namespace NodeJS {
  interface ProcessEnv extends StringifyValues<
    Pick<Cloudflare.Env, "BETTER_AUTH_SECRET" | "BETTER_AUTH_URL">
  > {}
}
```

This bridge is what makes `process.env.BETTER_AUTH_SECRET` work inside the Workers runtime
when `nodejs_compat` is enabled — both refer to the same underlying value.

---

## The Shared Packages That Touch Env

Two packages currently use `@t3-oss/env-core` and read from `process.env`.
Neither package has its own `.env` file — they rely on values being present in
`process.env` at runtime, which in the Workers context comes through the bridge above.

### `packages/auth/src/env.ts`

```ts
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const authEnv = createEnv({
  server: {
    BETTER_AUTH_SECRET: z.string().min(32),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
```

Consumed in `packages/auth/src/index.ts`:

```ts
export function createAuth(db: Db, options: { baseURL: string }) {
  return betterAuth({
    secret: authEnv.BETTER_AUTH_SECRET, // <-- from T3 env / process.env
    baseURL: options.baseURL,           // <-- passed in from cloudflare:workers env
    ...
  });
}
```

Note: `BETTER_AUTH_SECRET` is accessed two different ways in the same request lifecycle:
- Via `cloudflare:workers` env → typed, binding-level access (the Workers-native way)
- Via `process.env` → T3 env validation (the Node.js way, bridged by `worker-configuration.d.ts`)

### `packages/config/src/env.ts`

```ts
export const configEnv = createEnv({
  server: {
    AI_GATEWAY_API_KEY: z.string(),
    OPENAI_API_KEY: z.string(),
  },
  clientPrefix: "NEXT_PUBLIC_",
  client: {
    NEXT_PUBLIC_VERCEL_ENV: z.enum(["production", "preview", "development"]).optional(),
    NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
    NEXT_PUBLIC_VERCEL_BRANCH_URL: z.string().optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
```

**Issues with this file:**
- `AI_GATEWAY_API_KEY` and `OPENAI_API_KEY` are required but not present in `.dev.vars`,
  `.env`, or `.env.example` — this will fail validation at startup if `@workspace/config`
  is ever imported in a context where these vars are missing.
- The `NEXT_PUBLIC_` prefix and Vercel URL variables are leftovers from the removed Next.js
  app (`apps/web`). They have no relevance to a Cloudflare Workers deployment.
- `@workspace/config` is currently a dependency of `@workspace/auth`, which means every
  time auth is initialized, `configEnv` is evaluated and all its required variables are
  validated — including the AI keys.

### `packages/config/src/url.ts`

```ts
export const BASE_URL = (() => {
  if (typeof window !== "undefined") return window.location.origin;
  if (configEnv.NEXT_PUBLIC_VERCEL_ENV === "production" && ...) return `https://...`;
  if (configEnv.NEXT_PUBLIC_VERCEL_ENV === "preview" && ...) return `https://...`;
  return "http://localhost:3000"; // <-- hardcoded fallback
})();
```

Used by `packages/auth/src/client.ts` to set the auth client's `baseURL`. The hardcoded
fallback is `localhost:3000` but the app runs on port **3001** — a mismatch.

---

## Where Env Files Live Today

| File | Location | Committed | Purpose |
|---|---|---|---|
| `.env` | repo root | No | Was used by the removed Next.js app. Currently only holds `BETTER_AUTH_SECRET` but this is redundant with `.dev.vars`. |
| `.env.example` | repo root | Yes | Template. Currently only documents `BETTER_AUTH_SECRET`. |
| `.dev.vars` | `apps/web-tanstack/` | No | Wrangler local dev secrets. The correct place for this app's env. |
| `.dev.vars.example` | `apps/web-tanstack/` | Does not exist | Should be created as a committed template. |

---

## The Core Problem

The root `.env` file is a leftover from the Next.js era. The app is now entirely Cloudflare
Workers, where the correct mechanism is `.dev.vars` (locally) and `wrangler secret put`
(production). Node.js-style `.env` files have no first-class role in a Wrangler project.

Currently the two mechanisms coexist:

```
.dev.vars (Wrangler)
    └── loaded by @cloudflare/vite-plugin during dev
    └── available via `import { env } from "cloudflare:workers"`
    └── bridged to process.env via nodejs_compat + worker-configuration.d.ts

process.env (Node.js / T3 env)
    └── read by packages/auth/src/env.ts
    └── read by packages/config/src/env.ts
    └── works in Workers only because of the bridge above
    └── would also read from root .env if loaded by something — but nothing loads it
```

The root `.env` is not loaded by anything in the current Workers setup. Values reach
`process.env` solely through the `nodejs_compat` bridge from Wrangler, not from the file.
The root `.env` file is therefore inert for `web-tanstack`.

---

## Open Questions for the Engineer

1. **Should `packages/auth` and `packages/config` use T3 env at all?**
   Since the only consumer is a Cloudflare Workers app, `process.env` access via T3 env
   is an indirect path. The direct path is passing bindings through from the Workers `Env`
   object (already done for `BETTER_AUTH_URL` and `DB`). Should `BETTER_AUTH_SECRET` also
   be passed in as a parameter to `createAuth()` instead of read from `process.env`?

2. **Should `packages/config` be simplified or removed?**
   It contains Next.js-specific Vercel URL logic and `NEXT_PUBLIC_` prefixed vars that are
   no longer relevant. The `BASE_URL` logic and AI key validation may need to be moved
   into `apps/web-tanstack` directly.

3. **Where should `.dev.vars.example` live?**
   It should be committed to `apps/web-tanstack/` as the canonical reference for what
   secrets the Worker needs. Nothing equivalent currently exists.

4. **Should the root `.env` and `.env.example` be removed?**
   Now that `apps/web` is gone, there is no Node.js server that reads a root `.env`.
   App-level env belongs in `apps/web-tanstack/.dev.vars` (locally) and Cloudflare
   Worker secrets (production). The root files are misleading.

5. **How should env validation work for shared packages?**
   Currently `packages/auth` validates `BETTER_AUTH_SECRET` via T3 env at module load
   time. In the Workers model, it is more idiomatic to validate bindings at the call site
   (i.e. inside `createAuth()`) using the typed `Env` object, rather than relying on the
   `process.env` bridge. Cloudflare's own guidance does not recommend T3 env for Workers.

6. **`AI_GATEWAY_API_KEY` and `OPENAI_API_KEY`** are declared as required in
   `packages/config/src/env.ts` but exist nowhere in any env file. If this package is
   imported, the app will crash on startup. These need to either be added to `.dev.vars`
   or the validation needs to be moved to the app layer.
