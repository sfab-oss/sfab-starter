# AGENTS.md

Tier-1 entry point for anyone — human or AI agent — working in this repo. It
carries **commands + conventions + the index into everything else**, and nothing
deeper: follow the links for detail.

> `AGENTS.md` and `.claude/CLAUDE.md` are kept **byte-identical** — mirrored as
> real copies, not a symlink, since some tools don't auto-read a symlinked
> instructions file. Change one, copy it over the other.

## Commands

Run from the **monorepo root** (not inside a package):

| Task | Command |
|---|---|
| Dev server | `pnpm dev` |
| Type check | `pnpm typecheck` |
| Format + lint (fix) | `pnpm lint:fix` |
| Lint (check only) | `pnpm lint:check` |
| Tests | `pnpm test` |
| Build | `pnpm build` |
| Generate a migration | `pnpm db:generate` |
| Apply migrations (local) | `pnpm db:migrate` |
| Reset local DB | `pnpm db:reset` |
| Drizzle Studio | `pnpm db:studio` |
| Regenerate env types | `pnpm cf-typegen` (from the web app) |

## Conventions (the short version)

- **Layer-sliced, feature-keyed.** A capability is the same key `<cap>` repeated
  across layers (`db` → `contract` → `core` → surfaces → `ui`/`components`). Find
  one slice, you know where the other five live. → [`docs/architecture.md`](docs/architecture.md)
- **Two schema sources, by direction.** Row types come from `db` (`$infer`); input
  types come from `contract` (hand-written Zod). **No `drizzle-zod` derivation.**
  Inbound is defined once in `contract`; outbound is inferred from `core`. → [ADR-004](docs/decisions/004-schema-sources-and-boundary-types.md)
- **Naming = role over technology** (`db` not `db-d1`, `contract` not `types`,
  `env` not `cloudflare-env`); scope stays `@workspace/*`.
- **Timestamps are ISO `text`** for domain tables; money is integer minor units
  (`moneyMinor` customType + `core/money` math; floats never touch money — ADR-006).
- **Boundaries are mechanical** — the `package.json` dep graph + the
  `cloudflare:workers`/server-only import guard make illegal cross-layer imports
  fail on their own. Don't add a wiring file; `import { db } from "@workspace/db"`.
- **Generated files are never hand-edited** — `packages/env/src/env.d.ts` and the
  app's `worker-configuration.d.ts` come from `pnpm cf-typegen`.

## Where things live (index)

- **What the system is** → [`docs/architecture.md`](docs/architecture.md) — the
  layer map + a worked `customer` slice; the **transaction hub** every commercial
  flow grafts onto → [`docs/architecture/transaction-core.md`](docs/architecture/transaction-core.md).
- **Why a choice was made** → [`docs/decisions/`](docs/decisions/) — ADRs, under a
  strict significance bar ([template](docs/decisions/template.md)).
- **How to do/extend something here** → [`docs/guides/`](docs/guides/).
- **Procedural domain knowledge, loaded on demand** → `.agents/skills/`
  (`cloudflare`, `ai-sdk`, `wrangler`, `durable-objects`, `workers-best-practices`,
  `agent-browser`). Use the relevant skill when a task matches its domain.
- **Adopting / transforming the template** (suggested interview + reshape path)
  → [`docs/template-init.md`](docs/template-init.md). Setup, env, and run →
  [`README.md`](README.md).

## Code standards

This project uses **Biome** for formatting and linting. Fix with `pnpm lint:fix`;
verify with `pnpm typecheck` and `pnpm lint:check`. Run from the root.

- **Self-descriptive code first** — names and types should carry the *what*; comments
  only for non-inherent *why* (invariants, races, platform quirks, ADR/ALW links).
- **No narration** — drop section banners, JSX region labels, name-echo JSDoc, and
  step labels that restate the next line.
- **Prefer refactor over clarifying comments** when the code is unclear (rename /
  extract in a separate change; hygiene passes are REMOVE-only).
- **Keep** money/RBAC/security notes, directive suppressions with reasons, and
  schema comments that encode real constraints — see
  [`docs/guides/comment-hygiene.md`](docs/guides/comment-hygiene.md).
