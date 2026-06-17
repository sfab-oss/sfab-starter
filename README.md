# SFab Monorepo Starter

A production-ready full-stack TypeScript monorepo template for building applications on Cloudflare Workers. Designed as the foundation for [SFab](https://github.com/alwurts/sfab) projects — optimized for AI-agent-assisted development.

## Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [TanStack Start](https://tanstack.com/start) (full-stack React) |
| **API** | [Hono](https://hono.dev/) with RPC — type-safe from route to client |
| **Database** | [Drizzle ORM](https://orm.drizzle.team/) + [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite) |
| **Auth** | [Better Auth](https://www.better-auth.com/) with organization plugin |
| **UI** | [shadcn/ui](https://ui.shadcn.com/) + Radix UI + Tailwind CSS v4 |
| **AI** | [Vercel AI SDK](https://sdk.vercel.ai/) with streaming, tool calling, and skill system |
| **Email** | [Resend](https://resend.com/) + [React Email](https://react.email/) |
| **Tooling** | Turbo, pnpm, Biome, TypeScript 5.9 |
| **Deployment** | Cloudflare Workers via Wrangler |

## Project structure

```
apps/
  web-tanstack/             # Main application (TanStack Start + Hono)
    src/
      routes/               # File-based routing (TanStack Router)
      hono/                 # API routes (public, protected, org-protected)
      lib/ai/               # AI agents, tools, and skills
      components/           # React components
      hooks/                # React Query hooks
packages/
  auth/                     # Better Auth configuration
  cloudflare-env/           # Cloudflare bindings type definitions
  core/                     # Business logic services
  db-d1/                    # Drizzle schema and migrations
  email/                    # Email templates and sending
  types/                    # Shared Zod schemas and TypeScript types
  ui/                       # Component library (shadcn/ui)
  typescript-config/        # Shared TSConfig
docs/
  architecture.md           # The layer map + a worked feature example
  decisions/                # Architecture Decision Records (ADRs)
  guides/                   # Code-anchored how-to / "how X works"
.agents/
  skills/                   # AI agent skills (cloudflare, ai-sdk, wrangler, etc.)
```

## Architecture

End-to-end type safety without code generation:

```
D1 (SQLite) → Drizzle Schema → Service Layer → Hono Route → RPC Client → React Query → UI
```

- **Services** in `packages/core/` own all business logic and database access
- **API routes** in `hono/` are thin wrappers that call services and return typed responses
- **React Query hooks** in `hooks/` call the Hono RPC client for data fetching with optimistic updates
- **Auth middleware** enforces authentication and organization-scoped access on protected routes

See [`docs/architecture.md`](docs/architecture.md) for the full layer map, the feature-key model, and a worked example. Working in this repo as an AI agent? Start from [`AGENTS.md`](AGENTS.md).

## Getting started

### Prerequisites

- Node.js 20+
- pnpm 10+

### Setup

```bash
# Clone and install
git clone <repo-url>
cd sfab-starter
pnpm install

# Configure environment
cp apps/web-tanstack/.dev.vars.example apps/web-tanstack/.dev.vars
# Edit .dev.vars with your values (see Environment Variables below)

# Set up database
pnpm db:migrate

# Start development
pnpm dev
```

The app runs at `http://localhost:4011`.

### Environment variables

Set these in `apps/web-tanstack/.dev.vars` for local development, or as Worker secrets in production (`wrangler secret put <NAME>`):

| Variable | Required | Description |
|----------|----------|-------------|
| `BETTER_AUTH_SECRET` | Yes | Auth secret key (min 32 characters) |
| `BETTER_AUTH_URL` | Yes | App URL (`http://localhost:4011` for dev) |
| `AI_GATEWAY_API_KEY` | For AI features | API key for AI model provider |
| `RESEND_API_KEY` | For email | Resend API key |
| `EMAIL_SENDER` | For email | Sender email address |
| `MOCK_SEND_EMAIL` | Optional | Set to `true` to skip sending real emails |

### Scripts

```bash
# Development
pnpm dev                  # Start dev server
pnpm build                # Build all packages
pnpm typecheck            # Type check everything
pnpm lint:fix             # Format and lint with Biome

# Database
pnpm db:generate          # Generate Drizzle migrations
pnpm db:migrate           # Apply migrations locally
pnpm db:migrate:prod      # Apply migrations to production
pnpm db:reset             # Reset local database
pnpm db:studio            # Open Drizzle Studio
```

## Example features

This template includes two example features that demonstrate the full-stack patterns. They are meant to show how to build on this template — you can keep, modify, or remove them.

### Inventory management

A complete CRUD feature covering products, warehouses, stock levels, and stock movements. Demonstrates:

- Database schema with relations (`packages/db-d1/src/schema/inventory.ts`)
- Service layer with business logic (`packages/core/src/products.ts`, `warehouses.ts`, `search.ts`)
- API routes with validation (`apps/web-tanstack/src/hono/org-protected/inventory/`)
- React Query hooks (`apps/web-tanstack/src/hooks/use-products.ts`, `use-warehouses.ts`)
- UI pages and components (`apps/web-tanstack/src/routes/_protected/inventory/`)

### AI chat

A streaming chat interface with tool calling and a skill system. Demonstrates:

- Chat persistence schema (`packages/db-d1/src/schema/chat.ts`)
- AI agent configuration and tool definitions (`apps/web-tanstack/src/lib/ai/`)
- Streaming API route (`apps/web-tanstack/src/hono/org-protected/chat.ts`)
- Chat UI components (`apps/web-tanstack/src/components/chat/`)

The AI tools in this template are wired to the inventory feature — the agent can create products, manage warehouses, etc. This shows how to connect domain features to AI capabilities.

## Removing example features

When starting a new project, you'll likely want to remove the example features and build your own. Here's what to clean up:

### To remove inventory

Delete these files/directories:
- `packages/db-d1/src/schema/inventory.ts`
- `packages/core/src/products.ts`, `warehouses.ts`, `search.ts`
- `packages/types/src/products.ts`, `warehouses.ts`, `search.ts`
- `apps/web-tanstack/src/hono/org-protected/inventory/`
- `apps/web-tanstack/src/routes/_protected/inventory/`
- `apps/web-tanstack/src/routes/_protected/warehouse-setup.tsx`
- `apps/web-tanstack/src/components/inventory/`
- `apps/web-tanstack/src/hooks/use-products.ts`, `use-warehouses.ts`, `use-search.ts`
- `apps/web-tanstack/src/lib/ai/tools/products.ts`, `warehouses.ts`
- `apps/web-tanstack/src/lib/ai/skills/registry/` (inventory-specific skills)

Then update these files to remove inventory references:
- `packages/db-d1/src/schema/index.ts` — remove `export * from "./inventory"`
- `apps/web-tanstack/src/hono/org-protected/index.ts` — remove inventory route import and `.route("/inventory", ...)`
- `apps/web-tanstack/src/lib/ai/tools/registry.ts` — remove product/warehouse tool imports and spreads
- `apps/web-tanstack/src/lib/ai/tools/groups.ts` — remove inventory tool groups
- `apps/web-tanstack/src/lib/ai/agents/general-agent.ts` — remove inventory skills from `availableCalled`
- `apps/web-tanstack/src/components/layout/app-sidebar.tsx` — remove Inventory and Warehouses nav items

### To remove chat

Delete these files/directories:
- `packages/db-d1/src/schema/chat.ts`
- `packages/core/src/chat.ts`
- `apps/web-tanstack/src/hono/org-protected/chat.ts`
- `apps/web-tanstack/src/routes/_protected/chat/`
- `apps/web-tanstack/src/components/chat/`
- `apps/web-tanstack/src/hooks/use-chat.ts`
- `apps/web-tanstack/src/lib/ai/` (entire directory, if removing all AI features)

Then update:
- `packages/db-d1/src/schema/index.ts` — remove `export * from "./chat"`
- `apps/web-tanstack/src/hono/org-protected/index.ts` — remove chat route import and `.route("/chat", ...)`

After removing features, run `pnpm typecheck` to catch any remaining references.

### To rename the project

When forking this template for a new project, update these values:

- `package.json` (root) — `name` field
- `apps/web-tanstack/wrangler.jsonc` — `name` and `d1_databases[0].database_name`
- `apps/web-tanstack/wrangler.test.jsonc` — matching test Worker and D1 names
- Database migration commands in `apps/web-tanstack/package.json` — must match `database_name`

## What stays (core infrastructure)

These are the building blocks you keep and build on:

- **Auth** — login, signup, onboarding, organization management, invitation flow
- **Database** — Drizzle + D1 with migration tooling
- **API layer** — Hono with public/protected/org-protected route groups and auth middleware
- **UI** — shadcn/ui component library, sidebar layout, theme switching
- **Email** — Resend integration with React Email templates
- **AI infrastructure** — agent framework, skill system, streaming (if keeping chat)
- **Config** — TypeScript, Biome, Turbo, pnpm workspace, Cloudflare env types

## AI agent skills

The `.agents/skills/` directory contains skills that AI coding agents (like Claude Code) can load for context when working on this codebase:

- **cloudflare** — Cloudflare Workers platform guidance
- **wrangler** — Wrangler CLI reference
- **durable-objects** — Cloudflare Durable Objects patterns
- **workers-best-practices** — Workers performance and patterns
- **ai-sdk** — Vercel AI SDK documentation

## License

MIT
