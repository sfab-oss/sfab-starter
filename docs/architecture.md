# Architecture

The one map of how this template is put together: the layers, how a feature
moves through them, and the rules that keep the boundaries honest. Read this
first — every ADR in `docs/decisions/` records *why* one of these choices was
made, and every guide in `docs/guides/` shows *how* to work within them.

The starter is a **generic worldwide ERP base**. Packs add opt-in capabilities
(and later country/vertical specifics); i18n handles language. Pack install is
real (`sfabKind: "pack"`, ADR-0010 / ADR-0017). The first pack is **mcp**
(`shadcn add sfab-oss/sfab-starter/mcp#<ref>` with `shadcn@4.20.1` and `-c apps/web`). Gallery items remain `block`.
The live information architecture is Catalog / Entities / Documents
(`apps/web/src/components/layout/platform-navigation.ts`).

## Guiding principles

- **Legible over optimal.** A new reader — human or AI agent — should be able to
  predict where a thing lives without searching. We trade a little ceremony for
  a layout you can guess.
- **Layer-sliced, feature-keyed.** A fixed, small set of layers. A capability is
  the same key (`<cap>`) appearing in each layer. Adding a feature means adding
  one more slice, not inventing a new structure.
- **One source of truth per fact, at its natural home.** The database owns row
  shapes; the boundary owns input shapes; the typechecker carries them outward.
  Nothing is hand-copied between layers.
- **Boundaries enforced by construction.** The dependency graph and the runtime
  import rules make an illegal cross-layer import fail on its own — not because a
  reviewer noticed.
- **Multi-surface by default.** UI, HTTP API, and AI tools are all just
  surfaces over the same `core`. `core` never imports a framework.

## The layers

A capability flows top-to-bottom; dependencies only ever point *down* this list.

| Layer | Home | Owns |
|---|---|---|
| **db** | `packages/db` | Drizzle schema (one file per capability) + the `db` client singleton. Leaf — no workspace deps. Row types via `$infer`. |
| **contract** | `packages/contract` | Pure boundary Zod for inputs/commands, feature-keyed (`contract/<cap>/`). Leaf — no workspace deps. Input types via `z.infer`. |
| **core** | `packages/core` | Queries + domain logic, feature-keyed (`core/<cap>/`). Framework-agnostic. Depends on `db` + `contract`. |
| **surfaces** | `apps/web/src/...` | The ways `core` is exposed: Hono HTTP (`hono/<auth-scope>/<cap>/`), AI Durable Objects, jobs. |
| **agent** | `packages/agent` | Binder-agnostic tool-parts (`tool-parts/<cap>/`) + in-app binder + DO classes (bound in `apps/web`). The one *packaged* surface. |
| **ui** | `packages/ui` | Primitives / design-system only. Depends on `contract`, never on `core`/`db`. |
| **components** | `apps/web/src/components/<cap>/` | Feature/composite components — built in-app from `ui` primitives. |

Cross-cutting homes: auth = `packages/auth`; typed env = `packages/env`; app locale catalogs = `packages/i18n` (`@workspace/i18n`, leaf — not a `core` facet);
structured ops logging = `packages/log` (`@workspace/log`, zero-dep leaf — not a `core` facet);
shared TS config = `packages/tsconfig`. Everything uses the generic
`@workspace/*` scope.

### Cross-layer feature-key consistency

The single most important rule: **a capability uses the same key in every
layer.** `db` keeps it to one file; the other layers give it a folder. So a
`customer` capability is *exactly*:

```
packages/db/src/schema/customer.ts          # one schema file
packages/contract/customer/                  # boundary zod for inputs
packages/core/customer/                      # queries + domain logic
apps/web/src/hono/org-protected/customer/    # HTTP surface (auth-scoped)
packages/agent/src/tool-parts/customer.ts    # AI tool-parts (in-app binder in `in-app/`)
apps/web/src/components/customer/             # feature components
```

Find one slice and you know where the other five live. Adding a feature is
dropping one `<cap>` slice into each layer; a registry **pack** is authored as a
vertical and installs as exactly these slices (see ADR-001 / the registry docs).

## Worked example: a read and a write through `customer`

**Write — "create a customer" (inbound):**

1. `contract/customer/` defines `createCustomerSchema` (Zod) — the *single*
   definition of valid input. It is shared as a runtime **value** by the HTTP
   route, the AI tool, and the client-side form.
2. `core/customer/createCustomer(input)` takes `input: z.infer<typeof
   createCustomerSchema>` — no hand-synced param type — and writes via the `db`
   singleton.
3. `apps/web/src/hono/org-protected/customer/` validates the request body with
   `createCustomerSchema` and calls `core`. The same schema powers the React
   form and the `customer` AI tool.

**Read — "list customers" (outbound):**

1. `core/customer/listCustomers()` queries `db`; its return type is just
   `Awaited<ReturnType<typeof listCustomers>>` — inferred from the
   implementation, never restated.
2. The Hono route returns it; the typed Hono RPC client gives the UI the shape
   via `InferResponseType`. React Query hooks consume that.

Nothing in this path re-declares the customer shape. Inputs are *defined* once
in `contract`; outputs are *inferred* once from `core`.

## Two schema sources, by direction

This template deliberately keeps **two independent type sources** and does **not**
derive one from the other (no `drizzle-zod`). See **ADR-004** for the full
rationale and the reversal it records.

- **db (drizzle)** → row/persistence types via `$infer`. The shape of stored data.
- **contract (zod)** → boundary input types via `z.infer`. The shape of accepted commands.

They answer different questions and are allowed to differ (a create command is
not a row). Drift between them is caught by **per-capability round-trip tests**,
not by a compile-time derivation chain. Direction split (**ADR-004**, D3):

- **Inbound** (inputs/commands): explicit Zod in `contract`, shared as runtime
  values across API / AI tools / client forms; `core` params are
  `z.infer<contract>`.
- **Outbound** (reads): **inferred** from the implementation — the typed Hono
  client (`InferResponseType`) for clients, `Awaited<ReturnType>` for the server.
- **Timestamps are ISO `text` end-to-end** for domain tables (Better-Auth's
  `Date` columns are an accepted internal-only exception). Money is a
  numeric → `number` customType.
- Types are identified by **import location + suffix** — no `Db*` prefix.

## Surfaces: one Worker app

`apps/web` is a single Cloudflare Worker that hosts **every** surface — the
TanStack Start UI, the Hono API (organized `auth-scope → feature`), the AI
Durable Objects, and background jobs. A new app is justified only when the
runtime genuinely differs, not when a new surface is added. This keeps one
deploy, one binding set, one env. See **ADR-001**.

MCP Streamable HTTP (`POST /mcp`) is **not** in the base. Install the `mcp`
pack with `pnpm dlx shadcn@4.20.1 add sfab-oss/sfab-starter/mcp#<ref> --yes -c apps/web`, then run
`apps/web/src/_pack/mcp/skill.md` (including `pnpm db:generate` and
`pnpm db:migrate`). Guide:
[`docs/guides/mcp.md`](guides/mcp.md).

The HTTP API is grouped by auth scope first, then capability:
`hono/{public,protected,org-protected}/<cap>/`. Auth middleware enforces the
scope; org-protected routes are organization-scoped.

## Naming (role over technology)

Packages and apps are named for the **role they play**, not the library that
implements them — so the layout survives a library swap. Scope stays
`@workspace/*`. The names in use are `apps/web`, `packages/db`,
`packages/contract`, `packages/env`, and `packages/tsconfig`. Boundary input
types live in `contract`; row types come from `db` `$infer` — see **ADR-004**.

## Mechanical boundaries

The layer rules are enforced *by construction*, not by review (**ADR-001**, D8):

- **Dependency graph.** Each `package.json` lists only its allowed deps:
  `contract` and `db` are leaves (no workspace deps); `core` = `db` + `contract`;
  `ui` = `contract` (never `core`/`db`); `apps/web` = `core` + `contract` + `ui`.
  An illegal import simply doesn't resolve.
- **Runtime guard.** `cloudflare:workers` / server-only imports keep server code
  out of client/`ui` layers.
- **CI cycle check.** A circular-dependency check runs in CI.

We deliberately skip TypeScript project-references and a custom ESLint boundary
plugin — the dep graph plus the import guard already make the wrong thing fail.

## The database & env singletons

`db` exports a singleton built from `import { env } from "cloudflare:workers"` —
any layer does `import { db } from "@workspace/db"` with no wiring file. Typed
env lives in `packages/env`, auto-generated from `wrangler.jsonc`. `core` is
Workers-runtime code, tested with the workerd test pool. Migrations live in
`packages/db/drizzle/`. See **ADR-002** (migrations) and **ADR-003** (env +
singleton).

Tests split by where they must run (ALW-305): a plain `*.test.ts` is a pure unit
test run in the fast `node` Vitest project, while anything that needs a binding —
`env.DB`/`SELF`, R2, or a Durable Object — is named `*.workerd.test.ts` and runs
in-workerd via `@cloudflare/vitest-pool-workers` against `wrangler.test.jsonc`.
The DO fixture + reference test live in `apps/web/src/workerd-test/`.

## Where to go next

- **The transaction hub** every commercial flow grafts onto →
  [`docs/architecture/transaction-core.md`](architecture/transaction-core.md)
  (why: [ADR-006](decisions/006-transaction-core.md)).
- **A candidate Mexican-SME operator pack** (not the live IA; that pack is
  unbuilt; pack *install* already exists) →
  [`docs/architecture/operator-ux.md`](architecture/operator-ux.md).
- **Deploy contract (Option Y)** — named `Deploy` workflow, `workflow_run`
  observation, migrations → deploy → secrets-sync →
  [`docs/architecture/deploy-contract.md`](architecture/deploy-contract.md).
- **Why** a choice was made → `docs/decisions/` (ADRs, under a strict
  significance bar — see ADR-005).
- **How** to do or extend something here → `docs/guides/`.
- **Procedural domain knowledge** an agent loads on demand → `.agents/skills/`.
- **Commands + conventions + the index into all of the above** → `AGENTS.md`.
