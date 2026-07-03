# SFab Starter

SFab is an open-source factory for building software with AI agents. This is its
starter template, an AI-native app foundation: every app you build on it ships
with an AI agent that works on your own data and business context. It is what new
SFab apps are built on, and a complete Cloudflare full-stack monorepo you can use
on its own.

## What's included

A real, working app, not a blank page. Run it and you get:

- **Authentication and organizations** (Better Auth with the organization
  plugin): sign-in, multi-tenant orgs, and org-scoped access wired through every
  layer.
- **A built-in AI agent** (the `agent` package): a durable, per-organization
  agent with chat that works from your data and business context. This is the
  AI-native part, and it is foundation rather than a demo. It is the kind of
  thing you keep when building, say, an ERP that comes with its own agent.
- **An end-to-end type-safe stack** with no code generation, from the database to
  the UI.

These are patterns to keep and make your own. Remove what you do not need, but the
wired-up auth, org-scoping, and agent are the point of the starter. See the worked
example in [`docs/architecture.md`](docs/architecture.md) for how a feature flows
through the layers.

## The base contract

The starter ships a **country-neutral transaction hub** — not a vertical demo.
Catalog (products) and Documents (quotes, orders, invoices) work end-to-end:
create a product, draft an invoice, add lines, finalize to draw a folio and freeze
the totals. This is the base; you build your domain on top of it.

**What ships in the base:**

- **Catalog** — products with integer-minor-unit pricing (the money convention;
  see `packages/core/src/money.ts`).
- **Documents** — the `documents`/`line_items`/`sequences`/`activity_log` hub
  with folio-atomic finalize, an event spine, and pack seams. The design lives in
  [`docs/architecture/transaction-core.md`](docs/architecture/transaction-core.md)
  (ADR-006).
- **The AI agent** — reads your data (catalog, documents, activity) and reasons
  about it. Money and document mutations stay user-gated by convention.

**What the base deliberately leaves out** (they graft on as packs or follow-on
work, never by editing the hub):

- Payments / settlement / allocation engine.
- A customer-credit wallet.
- A posting handler (inventory decrement, GL entry) — the `shouldAffectStock`
  gate and `afterCommit` seam are in place; the handler is pack-owned.

New projects clone, `pnpm install`, run migrations, and have a working neutral
app — nothing to delete before building a domain on top.

## Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [TanStack Start](https://tanstack.com/start) (full-stack React) |
| **API** | [Hono](https://hono.dev/) RPC, type-safe from route to client |
| **Database** | [Drizzle ORM](https://orm.drizzle.team/) + [Cloudflare D1](https://developers.cloudflare.com/d1/) |
| **Auth** | [Better Auth](https://www.better-auth.com/) with the organization plugin |
| **AI** | a built-in org agent on the [Vercel AI SDK](https://sdk.vercel.ai/) (streaming, tools) |
| **UI** | [shadcn/ui](https://ui.shadcn.com/) + Radix + [Tailwind CSS v4](https://tailwindcss.com/) |
| **Email** | [Resend](https://resend.com/) + [React Email](https://react.email/) |
| **Tooling** | Turbo, pnpm, Biome, TypeScript |
| **Deployment** | Cloudflare Workers via Wrangler |

## Getting started

Inside SFab, the factory creates an app for you. To use the starter on its own,
click **Use this template** on GitHub (or `git clone` it), then:

```bash
pnpm install

# Configure local env
cp apps/web/.dev.vars.example apps/web/.dev.vars
# Fill in apps/web/.dev.vars. The file documents each var.
# At minimum set BETTER_AUTH_SECRET and AI_GATEWAY_API_KEY.

# Set up the local database
pnpm db:migrate

# Run it
pnpm dev
```

Then open http://localhost:4011.

**Prerequisites:** Node 20+ and pnpm 10+.

To deploy, build and ship to Cloudflare Workers with Wrangler (`pnpm build`, then
`wrangler deploy`). See [`docs/`](docs/) for details.

## Project layout

A layer-sliced monorepo: one app in `apps/web`, with capabilities split
into packages (`core`, `db`, `auth`, `agent`, `ui`, and more). Find one slice
and you know where the rest live. The full map, the feature-key model, and a
worked example are in [`docs/architecture.md`](docs/architecture.md).

## Where to go next

- [`AGENTS.md`](AGENTS.md): start here if you are an AI agent working in this repo.
- [`docs/architecture.md`](docs/architecture.md): the layer map and a worked feature example.
- [`docs/guides/`](docs/guides/): code-anchored how-tos.
- [`docs/decisions/`](docs/decisions/): the architecture decision records.

## License

[MIT](LICENSE).
