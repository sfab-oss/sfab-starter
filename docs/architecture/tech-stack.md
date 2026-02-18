# Tech Stack

This document outlines the technologies used in this project and the rationale behind each choice.

## Core Technologies

### React 19

**What:** JavaScript library for building user interfaces
**Version:** 19.2.3

**Why React 19:**
- Server Components for improved performance
- Actions for simplified form handling
- `use` hook for resource reading
- Ref as prop (no more forwardRef)
- Stable and widely adopted

### Next.js 16

**What:** React framework with server-side rendering, routing, and more
**Version:** 16.1.2

**Why Next.js:**
- App Router for modern React patterns
- Server Components by default
- Built-in optimization (images, fonts, scripts)
- API routes when needed
- Turbopack for fast development

**Configuration highlights:**
- App Router (not Pages Router)
- Turbopack enabled for development
- React strict mode enabled

### TypeScript 5.9

**What:** Typed superset of JavaScript
**Version:** 5.9.3

**Why TypeScript:**
- Catch errors at compile time
- Better IDE support and autocomplete
- Self-documenting code
- Safer refactoring

**Configuration highlights:**
- `strict: true` - All strict checks
- `noUncheckedIndexedAccess: true` - Safer indexing
- `noEmit: true` - Next.js handles compilation

### Tailwind CSS 4

**What:** Utility-first CSS framework
**Version:** 4.1.18

**Why Tailwind v4:**
- New Oxide engine for faster builds
- CSS-first configuration
- Native CSS cascade layers
- Improved color system (OKLch)

**Configuration highlights:**
- OKLch color tokens for perceptual uniformity
- CSS custom properties for theming
- Dark mode via `.dark` class

## API & Data Layer

### Hono

**What:** Fast, lightweight web framework for building type-safe APIs
**Version:** 4.x

**Why Hono:**
- **RPC client** provides end-to-end type safety
- Extremely lightweight and fast
- Built-in validation with Zod
- Works seamlessly with Next.js API routes
- Better DX than tRPC for this use case

**Usage pattern:**
```typescript
// Server: Define typed routes
const routes = new Hono().get('/products', (c) => c.json(products));

// Client: Full type inference
const client = hc<typeof routes>('/api');
const res = await client.products.$get(); // Fully typed!
```

### React Query (TanStack Query)

**What:** Powerful data synchronization library for React
**Version:** 5.x

**Why React Query:**
- **Client-side data fetching** with excellent DX
- Automatic caching and background refetching
- Optimistic updates for instant UI feedback
- Built-in loading and error states
- Deduplication and request cancellation
- Perfect for interactive, real-time UIs

**Why not Server Components for data fetching?**
- More control over loading/error states
- Better for highly interactive UIs
- Optimistic updates and mutations
- Works with streaming (AI chat)
- Easier cache invalidation

**Usage pattern:**
```typescript
// Define a custom hook
export const useProducts = () => {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await apiClient.api.inventory.products.$get();
      return res.json();
    },
  });
};

// Use in component
const { data: products, isLoading } = useProducts();
```

### Drizzle ORM

**What:** TypeScript-first ORM for SQL databases
**Version:** 0.44.x

**Why Drizzle:**
- **TypeScript-first** with excellent type inference
- Lightweight with zero dependencies
- SQL-like syntax (easy to learn)
- Best-in-class migrations
- Drizzle Studio for database exploration
- Better performance than Prisma

**Configuration highlights:**
- PostgreSQL adapter
- Schema in `packages/db/src/schema/`
- Migrations managed with `drizzle-kit`
- Connection pooling with `pg`

**Usage pattern:**
```typescript
// Define schema
export const products = pgTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  price: text('price'),
});

// Type-safe queries
const allProducts = await db.select().from(products);
```

### PostgreSQL

**What:** Open-source relational database
**Version:** Latest (via Docker)

**Why PostgreSQL:**
- Robust and battle-tested
- Excellent TypeScript support via Drizzle
- Rich feature set (JSON, full-text search, etc.)
- Great performance
- Easy local development with Docker

## Authentication

### Better Auth

**What:** Modern, type-safe authentication library
**Version:** Latest

**Why Better Auth:**
- **Type-safe** session management
- Built-in social auth providers
- Database-agnostic (works with Drizzle)
- Middleware for protecting routes
- Email/password and OAuth support

**Configuration highlights:**
- Session-based authentication
- Stored in PostgreSQL via Drizzle
- Integrated with Hono middleware
- Context injection for protected routes

## AI Integration

### Vercel AI SDK

**What:** Library for building AI-powered streaming applications
**Version:** Latest

**Why Vercel AI SDK:**
- **Streaming responses** for real-time chat
- Provider-agnostic (OpenAI, Anthropic, etc.)
- React hooks for UI integration
- Tool/function calling support
- Excellent TypeScript support

**Features used:**
- Streaming text generation
- Tool calling for dynamic actions
- Message history management
- React hooks for chat UI

## UI Components

### shadcn/ui

**What:** Collection of reusable components built on Radix UI
**Version:** Components are copied, not installed

**Why shadcn/ui:**
- Full ownership of component code
- Built on accessible Radix primitives
- Customizable to project needs
- No version lock-in

### Radix UI

**What:** Unstyled, accessible UI primitives
**Version:** Various (e.g., react-slot 1.2.3)

**Why Radix:**
- Accessibility out of the box
- Unstyled for full design control
- Robust keyboard navigation
- Screen reader support

### Class Variance Authority (CVA)

**What:** Type-safe component variant management
**Version:** 0.7.1

**Why CVA:**
- Type-safe variant props
- Composable variant combinations
- Works perfectly with Tailwind
- Clean component APIs

## Build & Development

### Turbo

**What:** High-performance build system for monorepos
**Version:** 2.7.4

**Why Turbo:**
- Intelligent task caching
- Parallel task execution
- Dependency-aware builds
- Remote caching capability

### pnpm

**What:** Fast, disk-efficient package manager
**Version:** 10.4.1

**Why pnpm:**
- Faster than npm/yarn
- Disk space efficient (content-addressable store)
- Strict dependency resolution
- Excellent workspace support

### Biome

**What:** Fast formatter and linter
**Version:** 2.3.11 (via Ultracite 7.0.11)

**Why Biome:**
- Single tool for format + lint
- 10-100x faster than ESLint + Prettier
- Zero configuration with Ultracite
- Consistent code style

## Validation & Type Safety

### Zod

**What:** TypeScript-first schema validation
**Version:** 4.3.5

**Why Zod:**
- **Runtime validation** at API boundaries
- Automatic TypeScript type inference
- Composable schemas
- Great error messages
- Used with Hono for request validation

**Usage pattern:**
```typescript
// Define schema
const createProductSchema = z.object({
  name: z.string().min(1),
  price: z.string().optional(),
});

// Use in Hono route
app.post('/products', zValidator('json', createProductSchema), (c) => {
  const data = c.req.valid('json'); // Fully typed!
});
```

### @t3-oss/env

**What:** Type-safe environment variable validation using Zod schemas
**Packages:** `@t3-oss/env-core` (framework-agnostic), `@t3-oss/env-nextjs` (Next.js specific)

**Why @t3-oss/env:**
- Runtime validation of environment variables
- Type-safe access to env vars (no more `process.env`)
- Build-time error detection
- Centralized env configuration
- Monorepo-friendly (packages define their own env schemas)

**Configuration highlights:**
- Each package defines its own env schema in `src/env.ts`
- App-level env extends package schemas for composition
- Single `.env` file at monorepo root
- Validation fails fast with descriptive error messages

## Additional Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| next-themes | 0.4.6 | Theme switching (dark mode) |
| clsx | 2.1.1 | Conditional class names |
| tailwind-merge | 3.3.1 | Merge Tailwind classes without conflicts |
| lucide-react | 0.475.0 | Icon library |
| nanoid | 5.1.0 | Unique ID generation |
| @hono/zod-validator | Latest | Zod integration for Hono |

## Architecture Patterns

### Service Layer

All database operations are abstracted into service functions:

```
packages/db/src/services/
├── chat.ts          # Chat CRUD operations
├── products.ts      # Product management
├── warehouses.ts    # Warehouse operations
└── search.ts        # Global search
```

**Benefits:**
- Reusable across different API routes
- Easier to test
- Centralized business logic
- Type-safe return values

### React Query Hooks

Each entity has corresponding React Query hooks:

```
apps/web/hooks/query/
├── use-products.ts  # Products queries & mutations
├── use-warehouses.ts
└── use-chats.ts
```

**Pattern:**
- `use[Entity]` - Fetch list
- `use[Entity]` - Fetch single item
- `useCreate[Entity]` - Create mutation
- `useUpdate[Entity]` - Update mutation
- `useDelete[Entity]` - Delete mutation

## Version Management

Dependencies are managed with:
- Exact versions in `package.json` (no `^` or `~` where possible)
- pnpm lockfile for reproducible installs
- Renovate/Dependabot for automated updates (recommended)

## Upgrade Considerations

When upgrading major versions:

1. **React** - Check for breaking changes in hooks, lifecycle
2. **Next.js** - Review migration guide, especially for App Router changes
3. **Tailwind** - v4 uses new config format (CSS-based)
4. **TypeScript** - May introduce new strict checks
5. **React Query** - Check migration guide for hook API changes
6. **Drizzle** - Review schema and query API changes

