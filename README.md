# SFab Starter

An AI-native app foundation: every app you build on it ships with an AI agent
that works on your own data and business context. It is a complete Cloudflare
full-stack monorepo you can clone and run.

![SFab Starter invoice with org agent](docs/assets/og-invoice-chat.png)

## Getting started

In 2026 the usual path is to hand this repo to an AI coding agent. Use this
template on GitHub or clone it, open the folder in Cursor / Claude Code /
Codex, or paste the repo URL into ChatGPT or Claude. Ask it to read
[`docs/template-init.md`](docs/template-init.md) and reshape the starter into
your product. That guide includes deleting `.sfab/` (platform scaffolding the
factory would strip for you; the public template leaves it in place).
[`AGENTS.md`](AGENTS.md) is what agents should read for day-to-day commands and
conventions once they are working in the repo.

To run the app you need Node 20+ and pnpm 11+. This repo pins
`packageManager: pnpm@11.5.2`. If needed, run `corepack enable`.

Clone or use the template, then install dependencies:

```bash
git clone https://github.com/sfab-oss/sfab-starter.git
cd sfab-starter
pnpm install
```

Copy the example env file and fill in the values it documents. Set a
`BETTER_AUTH_SECRET`; see the [Better Auth installation](https://www.better-auth.com/docs/installation)
docs if you need help generating one.

The built-in AI agent needs an inference provider. The default is
[Vercel AI Gateway](https://vercel.com/docs/ai-gateway); you can also use
Cloudflare Workers AI or [z.ai](https://z.ai/). Sign-in works without a
provider; chat does not. Setup details:
[`docs/guides/org-agent-inference-providers.md`](docs/guides/org-agent-inference-providers.md).

```bash
cp apps/web/.dev.vars.example apps/web/.dev.vars
```

Migrate the local database and start the app:

```bash
pnpm db:migrate
pnpm dev
```

Open http://localhost:4011 and create an account at `/signup`.

Want sample data instead? Run `pnpm db:seed`. Local only.

To deploy: run `pnpm build`, then `wrangler deploy` from `apps/web`. Set Worker
secrets with `wrangler secret put`, and migrate the remote D1 database before
serving traffic.

## What's included

A real, working app, not a blank page:

- **Authentication and organizations** via Better Auth with the organization
  plugin: sign-in, multi-tenant orgs, and org-scoped access wired through every
  layer.
- **Catalog.** Products with integer-minor-unit pricing. See
  `packages/core/src/money.ts`.
- **Documents.** Quotes, orders, and invoices end-to-end: draft, line items,
  finalize with a folio, activity log. Design notes:
  [`docs/architecture/transaction-core.md`](docs/architecture/transaction-core.md).
- **Pay-on-document.** Record payments on finalized invoices and bills;
  payment status on the documents list and detail.
- **A built-in org agent.** Chat over your data. It can read catalog,
  documents, and activity, and can create/update products. Money and document
  mutations stay on the UI.
- **An end-to-end type-safe stack** with no code generation, from the database
  to the UI.

Remove what you do not need; keep auth, org-scoping, and the agent unless you
have a clear reason not to. A worked feature walkthrough is in
[`docs/architecture.md`](docs/architecture.md).

## Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [TanStack Start](https://tanstack.com/start), full-stack React |
| **API** | [Hono](https://hono.dev/) RPC, type-safe from route to client |
| **Database** | [Drizzle ORM](https://orm.drizzle.team/) + [Cloudflare D1](https://developers.cloudflare.com/d1/) |
| **Auth** | [Better Auth](https://www.better-auth.com/) with the organization plugin |
| **AI** | Built-in org agent on the [Vercel AI SDK](https://sdk.vercel.ai/) |
| **UI** | [shadcn/ui](https://ui.shadcn.com/) + [Base UI](https://base-ui.com/) + [Tailwind CSS v4](https://tailwindcss.com/) |
| **Email** | [Resend](https://resend.com/) + [React Email](https://react.email/) |
| **Tooling** | Turbo, pnpm, Biome, TypeScript |
| **Deployment** | Cloudflare Workers via Wrangler |

## Project layout

A layer-sliced monorepo: one app in `apps/web`, with capabilities split into
packages such as `core`, `db`, `auth`, `agent`, and `ui`. Find one slice and
you know where the rest live. The full map, the feature-key model, and a worked
example are in [`docs/architecture.md`](docs/architecture.md).

## Where to go next

- [`docs/template-init.md`](docs/template-init.md): first-pass reshape guidance.
- [`AGENTS.md`](AGENTS.md): commands and conventions once you are working in the repo.
- [`docs/architecture.md`](docs/architecture.md): the layer map and a worked feature example.
- [`docs/guides/`](docs/guides/): code-anchored how-tos.
- [`docs/decisions/`](docs/decisions/): the architecture decision records.

## License

[MIT](LICENSE).
