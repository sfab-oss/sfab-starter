# ADR-005: Schema Derivation with drizzle-zod and Service Extraction to Core Package

**Status:** Proposed
**Date:** 2026-03-13
**Authors:** Team

## Context

Our monorepo has two disconnected type systems for the same data:

1. **Drizzle schemas** in `packages/db-d1/src/schema/` define table structure and export types via `$inferSelect` / `$inferInsert`
2. **Zod schemas** in `packages/types/src/` manually redefine the same shapes for API validation

These definitions can drift independently. For example, `products` in Drizzle has `price: text().default("0")` while the Zod `productSchema` defines `price: z.string().nullable()` — subtly different semantics with nothing enforcing consistency.

Additionally, the dependency direction is inverted: `db-d1` depends on `@workspace/types` for service input types (`CreateProduct`, `UpdateProduct`), but `types` independently redefines what the DB row looks like. The canonical source of truth (Drizzle) should flow _into_ the validation layer, not the other way around.

A sister project (Korra/Keystone) solved these problems with:
- **drizzle-zod** to derive Zod schemas from Drizzle tables
- A separate **core** package for business logic, keeping the DB package schema-only
- A **schemas** package to re-export DB-derived types and add API-level concerns

We need to decide how much of that pattern to adopt for this template.

## Decision

> We will adopt drizzle-zod for schema derivation and extract services into a `packages/core` package, while keeping a single `types` package (no separate `schemas` or `primitives` packages) to avoid over-engineering.

This gives us single-source-of-truth type safety without the package overhead of the Korra approach.

## Options Considered

### Option 1: Keep Current Structure (Status Quo)

**Description:** Leave services in `db-d1`, keep manual Zod schemas in `types`.

**Pros:**
- No migration effort
- Fewer packages to manage
- Already working

**Cons:**
- Dual type definitions that can drift silently
- Inverted dependency direction (`db-d1` → `types` → redefines DB shape)
- No compile-time guarantee that Zod schemas match Drizzle tables
- Bug class: runtime validation accepts data the DB rejects (or vice versa)

### Option 2: Full Korra Pattern (db + core + schemas + primitives)

**Description:** Adopt the Korra architecture: schema-only DB, separate core for services, separate schemas package for re-exports and API schemas, separate primitives package for reusable Zod building blocks.

**Pros:**
- Maximum separation of concerns
- Each package has exactly one responsibility
- Proven at scale in the Korra project

**Cons:**
- Four new/restructured packages for a template with one app
- `schemas` package is mostly pass-through re-exports at this scale
- `primitives` package premature — no complex cross-cutting validation yet
- More configuration (package.json, tsconfig) overhead
- Higher barrier to understand for new developers using the template

### Option 3: Hybrid — drizzle-zod + core extraction, single types package (Recommended)

**Description:** Add drizzle-zod to `db-d1` for schema derivation, extract services to a new `packages/core`, and revise `packages/types` to re-export DB-derived types while keeping its API-level schemas. No `schemas` or `primitives` packages.

**Pros:**
- Single source of truth: Drizzle table → drizzle-zod → Zod schema → TypeScript type
- Clean dependency direction: `db-d1` ← `types` ← `core` ← `web`
- Services separated from schema definitions (clear provenance)
- Minimal package count increase (only adds `core`)
- Natural upgrade path to full Korra pattern if complexity grows

**Cons:**
- Migration effort to restructure existing code
- `types` does double duty (re-exports + API schemas) — acceptable at this scale
- One more package (`core`) to maintain

### Option 4: drizzle-zod Only (No Service Extraction)

**Description:** Add drizzle-zod to `db-d1/types/` and revise `@workspace/types` to re-export from there. Keep services in `db-d1`.

**Pros:**
- Fixes the type drift problem with minimal structural change
- No new packages
- Smallest migration surface

**Cons:**
- `db-d1` still has two responsibilities (schema + business logic)
- Dependency direction partially fixed but services still import `db` singleton internally
- Doesn't establish the service extraction pattern for future growth

## Consequences

### Positive

- **No type drift:** Zod validation schemas derive from Drizzle tables. Add a column, validation updates automatically
- **Correct dependency direction:** `db-d1` has zero workspace dependencies. `types` depends on `db-d1`. `core` depends on both. Clean DAG
- **Clear provenance:** Every type answers "where does this come from?" — either a Drizzle column (via drizzle-zod) or an explicit API-level definition in `types`
- **Testable services:** `core` can be tested independently from the DB schema package
- **Template quality:** Projects starting from this template inherit correct patterns from day one

### Negative

- **Migration effort:** Existing services, imports, and type definitions need restructuring
- **One more package:** `packages/core` adds a package to manage (tsconfig, package.json, exports)
- **drizzle-zod dependency:** Adds a build dependency (though it's maintained by the Drizzle team)

### Neutral

- `db-d1` becomes lighter (schema-only) but loses its services export path
- `types` package role shifts from "manual Zod schemas" to "re-export + API schemas"
- AI tools in the web app import from `@workspace/core` instead of `@workspace/db-d1/services/*`

## Implementation Notes

See [Schema Derivation and Service Extraction Plan](../plans/schema-derivation-and-service-extraction.md) for the detailed implementation plan.

### Key Patterns

**drizzle-zod schema generation** (`db-d1/src/types/products.ts`):
```typescript
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { products } from "../schema/inventory";

export const selectProductSchema = createSelectSchema(products);
export const insertProductSchema = createInsertSchema(products, {
  name: (s) => s.min(2, "Name must be at least 2 characters"),
}).omit({ userId: true });

export type SelectProduct = z.infer<typeof selectProductSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;
```

**types re-export with API additions** (`types/src/products.ts`):
```typescript
// DB-derived types (single source of truth)
export { selectProductSchema as productSchema, insertProductSchema as createProductSchema }
  from "@workspace/db-d1/types/products";
export type { SelectProduct as Product, InsertProduct as CreateProduct }
  from "@workspace/db-d1/types/products";

// API-only: composed types, form schemas, AI tool schemas
export const productWithStockSchema = selectProductSchema.extend({
  totalStock: z.number(),
});
```

**Service in core** (`core/src/products.ts`):
```typescript
import { db } from "@workspace/db-d1";
import { products, stockLevels } from "@workspace/db-d1/schema";
import type { CreateProduct } from "@workspace/types/products";

export const createProduct = async (data: CreateProduct & { userId: string }) => {
  return await db.insert(products).values(data).returning();
};
```

### Dependency Graph (After)

```
db-d1 (no workspace deps)
  ↑
types (depends on db-d1/types for re-exports)
  ↑
core (depends on db-d1 for schema + client, types for input types)
  ↑
web-tanstack (depends on core, types, auth, ui)
```

## Related Decisions

- [ADR-001](./001-monorepo-structure.md) - Monorepo structure (this extends the package organization)
- [ADR-003](./003-d1-migrations-monorepo.md) - D1 migrations (db-d1 package structure)

## References

- [drizzle-zod documentation](https://orm.drizzle.team/docs/zod)
- [drizzle-zod GitHub](https://github.com/drizzle-team/drizzle-orm/tree/main/drizzle-zod)
- Korra/Keystone project architecture (internal reference)
