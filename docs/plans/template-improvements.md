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

### 2. File uploads with Cloudflare R2 (priority: high)

No file upload pattern exists. R2 is the natural choice on Cloudflare. Very common in SaaS apps.

**Need:**
- R2 bucket binding in wrangler.jsonc
- Upload service (presigned URLs or direct upload)
- File metadata in DB (optional)
- UI component for file upload with progress
- Example: profile image or document attachment

### 3. Durable Objects (priority: high)

No Durable Objects example. DOs are a key Cloudflare primitive for stateful coordination.

**Need:**
- At least one DO example (e.g., rate limiter, real-time counter, or collaborative state)
- Wrangler config for DO bindings
- RPC pattern between Worker and DO
- Shows when to use DO vs D1

### 4. Data table pattern (priority: high)

@tanstack/react-table is in deps but not fully demonstrated with server-side sorting, filtering, pagination, and column visibility.

**Need:**
- Reusable data table component using @tanstack/react-table
- Server-side pagination (API + service layer)
- Column sorting and filtering
- URL-synced table state (query params)
- Example on the inventory list or whatever replaces it

### 5. Pagination (priority: high)

All list endpoints fetch everything. No offset/limit or cursor pattern.

**Need:**
- Paginated service function (offset/limit or cursor-based)
- Paginated API endpoint returning items + total/hasMore
- React Query hook with pagination support
- Ties into the data table pattern above

### 6. Optimistic updates (priority: medium)

React Query hooks use `invalidateQueries` after mutations (refetch everything). No optimistic update examples.

**Need:**
- At least one mutation showing `onMutate` → optimistic cache update → `onError` rollback
- Good candidate: toggling a status, deleting from a list, or inline edit

### 7. Error handling patterns (priority: medium)

No standard error response format, no error boundaries, no toast notifications for mutation failures.

**Need:**
- Standard API error response shape (e.g., `{ error: string, code: string }`)
- Hono error handler middleware
- React error boundaries in route tree
- Toast/notification system for mutation feedback (success + failure)

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
| 2 | Pagination + data table | Most universally needed patterns, improves the example feature |
| 3 | File uploads (R2) | Common requirement, shows another Cloudflare binding |
| 4 | Error handling + optimistic updates | Polish patterns that make the template production-ready |
| 5 | Durable Objects example | Advanced Cloudflare pattern |
| 6 | Background work (Queues/cron) | Nice to have, less common in MVPs |
