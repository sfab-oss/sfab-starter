# Schema Derivation and Service Extraction Plan

This document details the migration from the current architecture (manual Zod schemas + services in db-d1) to the target architecture (drizzle-zod derived schemas + services in packages/core).

See [ADR-005](../decisions/005-schema-derivation-and-service-extraction.md) for the decision rationale.

---

## Table of Contents

1. [Current State](#current-state)
2. [Target State](#target-state)
3. [Gap Analysis](#gap-analysis)
4. [Implementation Phases](#implementation-phases)
5. [Detailed Changes by Package](#detailed-changes-by-package)
6. [Migration Checklist](#migration-checklist)

---

## Current State

### Package Responsibilities

| Package | Current Role |
|---------|-------------|
| `@workspace/db-d1` | Drizzle schemas + services + DB client |
| `@workspace/types` | Manual Zod schemas + AI types + Hono types |

### Current Dependency Direction (Problematic)

```
@workspace/types (manually defines Product, Warehouse shapes)
       ↑
@workspace/db-d1 (imports CreateProduct, UpdateProduct from types)
       ↑
web-tanstack (imports services from db-d1, schemas from types)
```

The problem: `db-d1` depends on `types` for input types, but `types` independently redefines what DB rows look like. Two sources of truth, no enforced consistency.

### Current Type Definitions

**Drizzle** (`db-d1/src/schema/inventory.ts`):
```typescript
export const products = sqliteTable("products", {
  price: text("price").default("0"),       // text with default
  minStockLevel: integer("min_stock_level").default(5),
});
export type Product = typeof products.$inferSelect;  // Used internally
```

**Zod** (`types/src/products.ts`):
```typescript
export const productSchema = z.object({
  price: z.string().nullable(),             // nullable, not default
  minStockLevel: z.number().nullable(),     // nullable, not default
  totalStock: z.number(),                   // computed field, not a column
});
export type Product = z.infer<typeof productSchema>;  // Used in API/frontend
```

These are two different `Product` types with subtly different semantics.

### Current Files Involved

| File | Contains |
|------|----------|
| `packages/db-d1/src/schema/inventory.ts` | Drizzle tables + `$inferSelect` types |
| `packages/db-d1/src/schema/chat.ts` | Chat/message Drizzle tables |
| `packages/db-d1/src/services/products.ts` | Product CRUD + stock movements |
| `packages/db-d1/src/services/warehouses.ts` | Warehouse CRUD |
| `packages/db-d1/src/services/chat.ts` | Chat CRUD + message management |
| `packages/db-d1/src/services/search.ts` | Cross-entity search |
| `packages/db-d1/src/services/auth.ts` | getUserOrganization |
| `packages/types/src/products.ts` | Manual Zod: product, movement schemas |
| `packages/types/src/warehouses.ts` | Manual Zod: warehouse schemas |
| `packages/types/src/ai.ts` | AI agent/skill/tool types |
| `packages/types/src/hono.ts` | Hono context types |
| `packages/types/src/search.ts` | Search result types |
| `packages/types/src/utils.ts` | aiOptional helper |

---

## Target State

### Package Responsibilities

| Package | Target Role |
|---------|-------------|
| `@workspace/db-d1` | Drizzle schemas + drizzle-zod types + DB client (**no services**) |
| `@workspace/core` | Business logic services (**new package**) |
| `@workspace/types` | Re-exports from db-d1/types + API-only schemas + AI types + Hono types |

### Target Dependency Direction (Clean)

```
@workspace/db-d1 (zero workspace deps, schema + drizzle-zod types + client)
       ↑                        ↑
@workspace/types           @workspace/core
(re-exports db types,      (services, imports db-d1 for
 adds API schemas)          schema/client, types for input)
       ↑                        ↑
       └────── web-tanstack ─────┘
```

### Target Folder Structure

```
packages/
├── db-d1/
│   ├── src/
│   │   ├── schema/
│   │   │   ├── inventory.ts          # Drizzle tables (unchanged)
│   │   │   ├── chat.ts               # Drizzle tables (unchanged)
│   │   │   ├── auth.ts               # Drizzle tables (unchanged)
│   │   │   └── index.ts              # Barrel export (unchanged)
│   │   ├── types/                    # NEW: drizzle-zod generated
│   │   │   ├── products.ts           # select/insert/update schemas
│   │   │   ├── warehouses.ts
│   │   │   ├── movements.ts
│   │   │   ├── chat.ts
│   │   │   └── index.ts
│   │   ├── index.ts                  # DB client + schema re-export (remove service export)
│   │   └── utils.ts                  # id(), timestamps (unchanged)
│   └── package.json                  # Remove @workspace/types dep, add drizzle-zod
│
├── core/                             # NEW PACKAGE
│   ├── src/
│   │   ├── products.ts               # Moved from db-d1/services/products.ts
│   │   ├── warehouses.ts             # Moved from db-d1/services/warehouses.ts
│   │   ├── chat.ts                   # Moved from db-d1/services/chat.ts
│   │   ├── search.ts                 # Moved from db-d1/services/search.ts
│   │   └── auth.ts                   # Moved from db-d1/services/auth.ts
│   ├── package.json
│   └── tsconfig.json
│
├── types/
│   ├── src/
│   │   ├── products.ts               # REVISED: re-exports + API schemas
│   │   ├── warehouses.ts             # REVISED: re-exports + API schemas
│   │   ├── chat.ts                   # NEW: re-exports chat types
│   │   ├── ai.ts                     # Unchanged
│   │   ├── hono.ts                   # Unchanged
│   │   ├── search.ts                 # Unchanged
│   │   └── utils.ts                  # Unchanged
│   └── package.json                  # Add @workspace/db-d1 dep
```

---

## Gap Analysis

| Area | Current | Target | Gap |
|------|---------|--------|-----|
| Schema derivation | Manual Zod, disconnected from Drizzle | drizzle-zod, derived from Drizzle | Add drizzle-zod, create `db-d1/types/` |
| Service location | `db-d1/services/` | `packages/core/` | Create package, move files, update imports |
| types role | Defines schemas from scratch | Re-exports DB types + API-only schemas | Rewrite type files |
| db-d1 deps | Depends on `@workspace/types` | Zero workspace deps | Remove dependency, add drizzle-zod |
| types deps | No dependency on db-d1 | Depends on `@workspace/db-d1` | Add dependency, reverse direction |
| Computed types | `totalStock` mixed into `productSchema` | Separate `productWithStockSchema` | Split computed from raw types |
| Form schemas | Mixed with DB schemas | Clearly labeled as form/API-only | Keep in types, mark clearly |

---

## Implementation Phases

### Phase 1: Add drizzle-zod to db-d1

**Goal:** Generate Zod schemas from Drizzle tables. No other changes yet — existing code continues to work.

1. Add `drizzle-zod` and `zod` as dependencies to `packages/db-d1`
2. Create `packages/db-d1/src/types/` directory
3. Create drizzle-zod schema files for each domain:
   - `products.ts` — from `products` table
   - `warehouses.ts` — from `warehouses` table
   - `stock-levels.ts` — from `stockLevels` table
   - `movements.ts` — from `movements` table
   - `chat.ts` — from `chats` and `messages` tables
4. Add `"./types/*": "./src/types/*.ts"` export to `db-d1/package.json`
5. Verify: `pnpm typecheck` passes, no runtime changes

### Phase 2: Create packages/core

**Goal:** New package for business logic. Services moved from db-d1.

1. Create `packages/core/` with `package.json` and `tsconfig.json`
2. Move each service file from `db-d1/services/` to `core/src/`:
   - `products.ts` → update `import { db } from "../index"` to `import { db } from "@workspace/db-d1"`
   - `warehouses.ts` → same import update
   - `chat.ts` → same import update
   - `search.ts` → same import update
   - `auth.ts` → same import update
3. Update service imports to use drizzle-zod types from `@workspace/db-d1/types/*` instead of `@workspace/types/*` for DB-derived input types
4. Add package.json exports: `"./*": "./src/*.ts"`
5. Delete `packages/db-d1/src/services/` directory
6. Update `packages/db-d1/src/index.ts` — remove service re-export
7. Update `packages/db-d1/package.json` — remove `"./services/*"` export, remove `@workspace/types` dependency

### Phase 3: Revise packages/types

**Goal:** `types` becomes the public API layer. Re-exports DB-derived types, keeps API-only schemas.

For each domain file (`products.ts`, `warehouses.ts`):

1. Remove manual Zod schemas that mirror DB columns
2. Add re-exports from `@workspace/db-d1/types/*` with public-friendly names
3. Keep API-only schemas (form schemas, filter schemas, AI tool schemas)
4. Add composed types that don't exist in the DB (e.g., `productWithStockSchema`)

**Example transformation** (`types/src/products.ts`):

Before:
```typescript
// Manual Zod — disconnected from Drizzle
export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.string().nullable(),
  totalStock: z.number(),
  // ...redefined from scratch
});
```

After:
```typescript
// DB-derived types (single source of truth)
export {
  selectProductSchema,
  insertProductSchema as createProductSchema,
  updateProductSchema,
} from "@workspace/db-d1/types/products";
export type {
  SelectProduct as Product,
  InsertProduct as CreateProduct,
  UpdateProduct,
} from "@workspace/db-d1/types/products";

// Composed type: product + computed join fields (not a DB row)
export const productWithStockSchema = selectProductSchema.extend({
  totalStock: z.number(),
});
export type ProductWithStock = z.infer<typeof productWithStockSchema>;

// Form-specific schema (coercion, different defaults)
export const productFormSchema = createProductSchema.extend({
  price: z.number().min(0, "Price must be positive"),
  minStockLevel: z.number().min(0, "Minimum stock must be positive"),
  description: z.string().nullable(),
});

// AI tool schemas (with aiOptional, descriptions)
export const createMovementSchema = z.object({
  productId: z.string().describe("The ID of the product being moved"),
  type: z.enum(["IN", "OUT", "TRANSFER", "ADJUSTMENT"]).describe("..."),
  // ...
});
```

Update `types/package.json`: add `"@workspace/db-d1": "workspace:*"` dependency.

### Phase 4: Update all consumers

**Goal:** Update all import paths across the web app.

1. **Hono routes** — change `@workspace/db-d1/services/*` to `@workspace/core/*`
2. **AI tools** — change service imports to `@workspace/core/*`
3. **Any direct schema imports** — verify they point to the right source
4. Run `pnpm typecheck` and `pnpm build` to catch all broken imports
5. Verify all routes, AI tools, and frontend components work

---

## Detailed Changes by Package

### packages/db-d1

**package.json changes:**
```diff
  "exports": {
    ".": "./src/index.ts",
    "./schema": "./src/schema/index.ts",
    "./schema/chat": "./src/schema/chat.ts",
-   "./services/*": "./src/services/*.ts"
+   "./types/*": "./src/types/*.ts"
  },
  "dependencies": {
-   "@workspace/types": "workspace:*",
    "drizzle-orm": "^0.44.5",
+   "drizzle-zod": "^0.7.1",
    "nanoid": "^5.1.0",
+   "zod": "^3.24.0"
  },
```

**New file: `src/types/products.ts`:**
```typescript
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import type { z } from "zod";
import { products } from "../schema/inventory";

export const selectProductSchema = createSelectSchema(products);

export const insertProductSchema = createInsertSchema(products, {
  name: (s) => s.min(2, "Name must be at least 2 characters"),
  sku: (s) => s.min(2, "SKU must be at least 2 characters"),
}).omit({ userId: true, id: true, createdAt: true, updatedAt: true });

export const updateProductSchema = createUpdateSchema(products, {
  name: (s) => s.min(2),
  sku: (s) => s.min(2),
}).omit({ userId: true, id: true, createdAt: true, updatedAt: true });

export type SelectProduct = z.infer<typeof selectProductSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type UpdateProduct = z.infer<typeof updateProductSchema>;
```

**`src/index.ts` changes:**
```diff
  export const db = drizzle(env.DB, { schema });
  export type Db = typeof db;
  export * from "./schema";
- export { getUserOrganization } from "./services/auth";
```

**Deleted:** entire `src/services/` directory (moved to core).

### packages/core (New)

**package.json:**
```json
{
  "name": "@workspace/core",
  "version": "0.0.1",
  "private": true,
  "exports": {
    "./*": "./src/*.ts"
  },
  "dependencies": {
    "@workspace/db-d1": "workspace:*",
    "@workspace/types": "workspace:*",
    "drizzle-orm": "^0.44.5"
  },
  "devDependencies": {
    "@workspace/typescript-config": "workspace:*",
    "typescript": "^5.9.3"
  }
}
```

**tsconfig.json:**
```json
{
  "extends": "@workspace/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

**src/products.ts** (moved from db-d1, updated imports):
```typescript
import type { CreateProduct, UpdateProduct } from "@workspace/types/products";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@workspace/db-d1";
import { movements, products, stockLevels } from "@workspace/db-d1/schema";

export const getProducts = async (userId: string) => { /* same logic */ };
export const createProduct = async (data: CreateProduct & { userId: string }) => { /* same logic */ };
// ... rest of services unchanged
```

### packages/types

**package.json changes:**
```diff
  "dependencies": {
+   "@workspace/db-d1": "workspace:*",
    "ai": "6.0.39",
-   "zod": "4.3.5"
+   "zod": "^3.24.0"
  }
```

> Note: drizzle-zod currently requires Zod v3. When it supports Zod v4+, update accordingly.

**src/products.ts** (revised):
```typescript
import { z } from "zod";
import { selectProductSchema } from "@workspace/db-d1/types/products";
import { aiOptional } from "./utils";

// ═══════════════════════════════════════════════
// DB-derived types (source of truth: Drizzle)
// ═══════════════════════════════════════════════
export {
  selectProductSchema,
  insertProductSchema as createProductSchema,
  updateProductSchema,
} from "@workspace/db-d1/types/products";

export type {
  SelectProduct as Product,
  InsertProduct as CreateProduct,
  UpdateProduct,
} from "@workspace/db-d1/types/products";

// ═══════════════════════════════════════════════
// Composed types (DB row + computed fields)
// ═══════════════════════════════════════════════
export const productWithStockSchema = selectProductSchema.extend({
  totalStock: z.number(),
});
export type ProductWithStock = z.infer<typeof productWithStockSchema>;

// ═══════════════════════════════════════════════
// Form schemas (coercion for HTML form inputs)
// ═══════════════════════════════════════════════
export const productFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  sku: z.string().min(2, "SKU must be at least 2 characters"),
  price: z.number().min(0, "Price must be positive"),
  minStockLevel: z.number().min(0, "Minimum stock must be positive"),
  description: z.string().nullable(),
});

// ═══════════════════════════════════════════════
// AI tool schemas (nullable for AI SDK compat)
// ═══════════════════════════════════════════════
export const createMovementSchema = z.object({
  productId: z.string().describe("The ID of the product being moved"),
  type: z.enum(["IN", "OUT", "TRANSFER", "ADJUSTMENT"]).describe(
    "The type of movement. IN (restock), OUT (sales/removal), TRANSFER (between warehouses), ADJUSTMENT (stock correction)."
  ),
  quantity: z.coerce.number().min(1).describe("The quantity of items moved. Must be positive."),
  fromWarehouseId: aiOptional(z.string()).describe("The source warehouse ID."),
  toWarehouseId: aiOptional(z.string()).describe("The destination warehouse ID."),
  notes: aiOptional(z.string()).describe("Optional notes about the movement"),
});

export type CreateMovement = z.infer<typeof createMovementSchema>;
```

### apps/web-tanstack

**Import path changes across Hono routes:**
```diff
- import { getProducts, createProduct } from "@workspace/db-d1/services/products";
+ import { getProducts, createProduct } from "@workspace/core/products";

- import { getWarehouses, createWarehouse } from "@workspace/db-d1/services/warehouses";
+ import { getWarehouses, createWarehouse } from "@workspace/core/warehouses";
```

**AI tool files:** Same pattern — change service imports from `@workspace/db-d1/services/*` to `@workspace/core/*`.

**package.json:** Add `"@workspace/core": "workspace:*"` dependency.

---

## Migration Checklist

### Phase 1: drizzle-zod
- [ ] Add `drizzle-zod` and `zod` to `db-d1` dependencies
- [ ] Create `db-d1/src/types/products.ts`
- [ ] Create `db-d1/src/types/warehouses.ts`
- [ ] Create `db-d1/src/types/stock-levels.ts`
- [ ] Create `db-d1/src/types/movements.ts`
- [ ] Create `db-d1/src/types/chat.ts`
- [ ] Create `db-d1/src/types/index.ts` barrel export
- [ ] Add `"./types/*"` export to db-d1 package.json
- [ ] Run `pnpm typecheck`

### Phase 2: Create core
- [ ] Create `packages/core/` with package.json and tsconfig.json
- [ ] Move `db-d1/services/products.ts` → `core/src/products.ts`
- [ ] Move `db-d1/services/warehouses.ts` → `core/src/warehouses.ts`
- [ ] Move `db-d1/services/chat.ts` → `core/src/chat.ts`
- [ ] Move `db-d1/services/search.ts` → `core/src/search.ts`
- [ ] Move `db-d1/services/auth.ts` → `core/src/auth.ts`
- [ ] Update all imports in moved files (`../index` → `@workspace/db-d1`)
- [ ] Delete `db-d1/src/services/` directory
- [ ] Remove `"./services/*"` export from db-d1 package.json
- [ ] Remove `@workspace/types` dependency from db-d1 package.json
- [ ] Remove service re-export from `db-d1/src/index.ts`
- [ ] Run `pnpm install` and `pnpm typecheck`

### Phase 3: Revise types
- [ ] Add `@workspace/db-d1` dependency to types package.json
- [ ] Rewrite `types/src/products.ts` (re-export + API schemas)
- [ ] Rewrite `types/src/warehouses.ts` (re-export + API schemas)
- [ ] Add `types/src/chat.ts` if needed for chat-specific API types
- [ ] Keep `types/src/ai.ts` unchanged
- [ ] Keep `types/src/hono.ts` unchanged
- [ ] Keep `types/src/utils.ts` unchanged
- [ ] Run `pnpm typecheck`

### Phase 4: Update consumers
- [ ] Update Hono route imports (`db-d1/services/*` → `core/*`)
- [ ] Update AI tool imports (same change)
- [ ] Add `@workspace/core` to web-tanstack dependencies
- [ ] Run `pnpm typecheck`
- [ ] Run `pnpm build`
- [ ] Test all API routes manually or via existing tests
- [ ] Verify AI tools work end-to-end

### Post-Migration
- [ ] Update `docs/architecture/folder-structure.md` if it exists
- [ ] Update `docs/README.md` package references
- [ ] Accept ADR-005

---

## Open Questions

1. **Zod version compatibility:** drizzle-zod currently targets Zod v3. The types package uses Zod v4 (`4.3.5`). We need to verify drizzle-zod compatibility with Zod v4 or align versions. This may require waiting for drizzle-zod to release Zod v4 support, or pinning to Zod v3 temporarily.

2. **Auth service special case:** `getUserOrganization` is currently re-exported directly from `db-d1/src/index.ts`. It should move to `core/auth.ts` like the other services.

3. **Chat types from AI SDK:** The chat service uses `BaseAIUIMessage` from `@workspace/types/ai`. This means `core` will also depend on `@workspace/types` for AI-specific input types — which is fine, since the dependency direction is correct (`core` → `types`).

4. **Cloudflare runtime:** The `db` singleton uses `import { env } from "cloudflare:workers"`. When `core` imports from `@workspace/db-d1`, this works because packages are bundled into the Cloudflare Worker at build time — they don't run independently. This should be documented so future developers understand the constraint.
