# Template Improvements Analysis

Analysis of what the sfab-starter template needs to become a comprehensive starting point for AI-agent-built projects.

## Current state

The template has solid core infrastructure:
- Auth with org plugin, login/signup/onboarding/invitation flows
- Drizzle + D1 with migration tooling
- Hono API with public/protected/org-protected route groups
- shadcn/ui component library with sidebar layout
- Vercel AI SDK with streaming, tool calling, and skill system
- Resend email integration
- Biome, Turbo, pnpm workspace config

Two example features exist:
- **Inventory** — products, warehouses, stock levels, movements (full CRUD)
- **Chat** — AI chat with tool calling wired to inventory

## Missing patterns

### 1. Testing (priority: highest) — DONE

Full testing story is implemented:
- Vitest + @cloudflare/vitest-pool-workers for service and API tests
- Service tests: products (CRUD + stock movements + metrics), warehouses, chat
- API route tests: auth enforcement (401/403), products CRUD, warehouses CRUD via SELF
- E2E tests: Playwright for auth flows, inventory, navigation, warehouses
- Test helpers: seed functions, auth session creation via Better Auth API

### 2. File uploads with Cloudflare R2 (priority: high) — DONE

R2 file upload pattern implemented:
- R2 bucket binding in wrangler.jsonc (`R2_BUCKET`)
- Upload service in `packages/core/src/uploads.ts` (upload, get, delete with type/size validation)
- API routes: POST upload, GET serve (with caching headers), DELETE
- `ImageUpload` UI component with drag-and-drop, preview, remove
- Wired into product form (create + edit) via `imageUrl` field
- Product detail page shows image when present

### 3. Durable Objects (priority: high)

No Durable Objects example. DOs are a key Cloudflare primitive for stateful coordination.

**Need:**
- At least one DO example (e.g., rate limiter, real-time counter, or collaborative state)
- Wrangler config for DO bindings
- RPC pattern between Worker and DO
- Shows when to use DO vs D1

### 4. Data table pattern (priority: high) — DONE

Server-side data table pattern implemented:
- DataTable component upgraded with optional server-side mode (manual pagination/sorting/filtering)
- Backward-compatible: no props = client-side mode
- URL-synced table state via TanStack Router `validateSearch`

### 5. Pagination (priority: high) — DONE

Full server-side pagination implemented:
- Shared `PaginationQuery` schema + `PaginatedResponse` type (`packages/types/src/pagination.ts`)
- Paginated service functions with search filtering and sort column allowlists
- API endpoints return `{ data, total, page, pageSize }` via `zValidator("query", ...)`
- React Query hooks with `keepPreviousData` and parameterized query keys
- Applied to both products and warehouses list endpoints

### 6. Optimistic updates (priority: medium) — DONE

Optimistic update pattern implemented:
- `useDeleteProduct` uses `onMutate` → snapshot all paginated list caches → optimistic remove → `onError` rollback
- Pattern uses `getQueriesData`/`setQueriesData` to handle paginated caches
- `onSettled` always refetches to sync with server state

### 7. Error handling patterns (priority: medium) — DONE

Full error handling story implemented:
- Hono `onError` handler on main app catches unhandled exceptions → `{ error: string }` JSON response
- `HTTPException` support for structured error throwing in routes
- TanStack Router `errorComponent` on `_protected` layout with "Try Again" / "Go Home"
- Toast notifications (`sonner`) on all product and warehouse mutation hooks (`onSuccess` + `onError`)
- Consistent `{ error: string }` response shape matching existing auth middleware pattern

### 8. Background work (priority: low)

No example of async/deferred processing.

**Need:**
- Cloudflare Queues or cron trigger example
- Use case: send welcome email async, process import, cleanup job
- Shows the producer/consumer pattern on Workers

## Example domain

Current inventory example works but has weaknesses:
- **Not relatable** — most SaaS builders aren't making warehouse systems
- **Too many entities** — 4+ tables for what should teach "here's how to build a feature"

Potential alternatives:
- **Contacts/CRM** — one main entity with activity/notes. Universal SaaS pattern.
- **Content/posts** — CRUD + rich text + status transitions (draft → published)
- **Projects + tasks** — but overlaps with sfab itself

Decision: TBD. The patterns matter more than the domain. Could keep inventory and just trim it down, or swap for something more universal when implementing the missing patterns.

## Prioritized roadmap

| Phase | Work | Why first |
|-------|------|-----------|
| ~~1~~ | ~~Testing setup + example tests~~ | ~~Done — 59 vitest tests + E2E~~ |
| ~~2~~ | ~~Pagination + data table~~ | ~~Done — server-side pagination, sorting, filtering with URL-synced state~~ |
| ~~3~~ | ~~File uploads (R2)~~ | ~~Done — R2 upload/serve/delete, image upload component~~ |
| ~~4~~ | ~~Error handling + optimistic updates~~ | ~~Done — Hono onError, route error boundary, toast notifications, optimistic delete~~ |
| 5 | Durable Objects example | Advanced Cloudflare pattern |
| 6 | Background work (Queues/cron) | Nice to have, less common in MVPs |
