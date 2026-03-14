# Testing Plan

Implementation plan for adding tests to the sfab-starter template. The goal is to demonstrate how to test every layer of the stack so that projects built from this template have a clear testing story from day one.

## Current state

- Vitest `^3.0.5` installed in `web-tanstack`
- `@testing-library/react` and `jsdom` installed but unused
- Zero test files, no vitest config, no Playwright
- `@cloudflare/vitest-pool-workers` not installed
- Test script exists: `"test": "vitest run"`

## Architecture

Two separate test environments are needed because the app has two runtimes:

1. **Workers tests** — service layer, API routes, D1 queries. Run inside the Cloudflare Workers runtime via `@cloudflare/vitest-pool-workers` with miniflare. These are the primary tests.
2. **E2E tests** — full browser tests via Playwright against a running dev server. Cover auth flows, navigation, and user-visible behavior.

Component tests (React Testing Library + jsdom) are optional. The Workers integration tests and E2E tests together give the most realistic coverage. If needed later, a Vitest workspace can add a jsdom environment for component unit tests.

## Setup

### Dependencies to add

```bash
# Workers test pool
pnpm add -D @cloudflare/vitest-pool-workers --filter web-tanstack

# Playwright (E2E)
pnpm add -D @playwright/test --filter web-tanstack
npx playwright install chromium
```

### File structure

```
apps/web-tanstack/
  vitest.config.ts              # Workers test config (separate from vite.config.ts)
  playwright.config.ts          # E2E test config
  test/
    env.d.ts                    # Type declarations for cloudflare:test
    apply-migrations.ts         # Setup: applies D1 migrations before tests
    helpers/
      auth.ts                   # Helper: create test users and sessions in D1
      seed.ts                   # Helper: seed test data
    services/
      products.test.ts          # Service layer tests (direct DB operations)
      warehouses.test.ts
      chat.test.ts
    api/
      products.test.ts          # Hono route tests via SELF
      warehouses.test.ts
      auth.test.ts              # Auth endpoint tests
    e2e/
      auth.spec.ts              # Login, signup, onboarding flows
      inventory.spec.ts         # CRUD operations through the UI
      navigation.spec.ts        # Sidebar, routing, protected routes
```

### vitest.config.ts

Separate from `vite.config.ts` — no TanStack Start, React, or Tailwind plugins. Vitest picks this up automatically over `vite.config.ts`.

```ts
import path from "node:path";
import {
  cloudflareTest,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(async () => {
  const migrationsPath = path.join(__dirname, "../../packages/db-d1/drizzle");
  const migrations = await readD1Migrations(migrationsPath);

  return {
    plugins: [
      tsconfigPaths({ projects: ["./tsconfig.json"] }),
      cloudflareTest({
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: {
          bindings: { TEST_MIGRATIONS: migrations },
        },
      }),
    ],
    test: {
      include: ["test/**/*.test.ts"],
      setupFiles: ["./test/apply-migrations.ts"],
    },
  };
});
```

### test/apply-migrations.ts

```ts
import { applyD1Migrations, env } from "cloudflare:test";

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
```

Runs once before all tests. `isolatedStorage` (on by default) snapshots the DB state after migrations so each test starts clean.

### test/env.d.ts

```ts
declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    TEST_MIGRATIONS: import("cloudflare:test").D1Migration[];
  }
}
```

## Test categories

### 1. Service layer tests (highest value)

Test the functions in `@workspace/core` directly against a real D1 instance. These are fast, isolated, and cover the actual business logic.

**Pattern:**

```ts
import { env } from "cloudflare:test";
import { drizzle } from "drizzle-orm/d1";
import { describe, it, expect, beforeEach } from "vitest";
import * as schema from "@workspace/db-d1/schema";

describe("products service", () => {
  beforeEach(async () => {
    // Seed data — isolated per test via isolatedStorage
    const db = drizzle(env.DB, { schema });
    await db.insert(schema.products).values({
      id: "prod-1",
      userId: "user-1",
      sku: "SKU-001",
      name: "Test Product",
      price: "19.99",
      minStockLevel: 10,
    });
  });

  it("returns products for a user", async () => {
    const { getProducts } = await import("@workspace/core/products");
    const products = await getProducts("user-1");
    expect(products).toHaveLength(1);
    expect(products[0].name).toBe("Test Product");
  });

  it("creates a product", async () => {
    const { createProduct } = await import("@workspace/core/products");
    const product = await createProduct("user-1", {
      sku: "SKU-002",
      name: "New Product",
      price: "29.99",
    });
    expect(product.sku).toBe("SKU-002");
  });
});
```

**What to cover:**
- `getProducts`, `getProduct`, `createProduct`, `updateProduct`, `deleteProduct`
- `getWarehouses`, `createWarehouse`, `updateWarehouse`, `deleteWarehouse`
- `performStockMovement` (the most complex business logic)
- `getDashboardMetrics`
- `searchInventory`
- `createChat`, `getChats`, `addMessageToChat`
- Edge cases: missing records, duplicate SKUs, invalid movements

**Key consideration:** The `@workspace/core` services use a `db` singleton created via `drizzle(env.DB)` where `env` comes from `cloudflare:workers`. Inside the test pool, `cloudflare:workers` resolves to the test miniflare env, so this should work transparently. If it doesn't, we may need to refactor services to accept `db` as a parameter.

### 2. API route tests (integration)

Test Hono routes via `SELF` which dispatches through the full Worker entry point, including middleware.

**Pattern:**

```ts
import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";

describe("inventory API", () => {
  it("returns 401 without auth", async () => {
    const res = await SELF.fetch(
      "http://localhost/api/protected/inventory/products"
    );
    expect(res.status).toBe(401);
  });

  it("returns products for authenticated user", async () => {
    // Create a test session (see auth helper below)
    const cookie = await createTestSession();
    const res = await SELF.fetch(
      "http://localhost/api/protected/inventory/products",
      { headers: { cookie } }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });
});
```

**Auth helper approach:** Better Auth stores sessions in D1. The test helper creates a user + session directly in the DB and returns the session cookie:

```ts
// test/helpers/auth.ts
import { env } from "cloudflare:test";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@workspace/db-d1/schema";

export async function createTestUser(overrides?: Partial<typeof schema.user.$inferInsert>) {
  const db = drizzle(env.DB, { schema });
  const userId = `test-user-${crypto.randomUUID()}`;
  await db.insert(schema.user).values({
    id: userId,
    name: "Test User",
    email: `${userId}@test.com`,
    emailVerified: true,
    ...overrides,
  });
  return userId;
}

export async function createTestSession(userId?: string) {
  const db = drizzle(env.DB, { schema });
  const uid = userId ?? await createTestUser();
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  await db.insert(schema.session).values({
    id: crypto.randomUUID(),
    userId: uid,
    token,
    expiresAt,
  });

  // Return cookie in the format Better Auth expects
  return `better-auth.session_token=${token}`;
}
```

**Note:** The exact cookie name and session lookup depend on Better Auth's implementation. This may need adjustment after testing.

**What to cover:**
- Auth enforcement (401 on all protected routes without session)
- CRUD operations on products and warehouses
- Input validation (bad payloads return 400)
- Org-scoped access (user in org A can't access org B data)

### 3. E2E tests (Playwright)

Test the full user experience in a real browser against a running dev server.

**playwright.config.ts:**

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test/e2e",
  webServer: {
    command: "pnpm dev",
    port: 3001,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: "http://localhost:3001",
  },
});
```

**Pattern:**

```ts
// test/e2e/auth.spec.ts
import { test, expect } from "@playwright/test";

test("signup and onboarding flow", async ({ page }) => {
  await page.goto("/signup");
  await page.fill('[name="email"]', "e2e@test.com");
  await page.fill('[name="password"]', "securepassword123");
  await page.fill('[name="name"]', "E2E User");
  await page.click('button[type="submit"]');

  // Should redirect to onboarding
  await expect(page).toHaveURL(/onboarding/);
});

test("login redirects to home", async ({ page }) => {
  // Assumes user exists from signup test or seeded data
  await page.goto("/login");
  await page.fill('[name="email"]', "e2e@test.com");
  await page.fill('[name="password"]', "securepassword123");
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL("/");
});

test("unauthenticated user redirected to login", async ({ page }) => {
  await page.goto("/inventory");
  await expect(page).toHaveURL(/login/);
});
```

**What to cover:**
- Signup → onboarding → home (happy path)
- Login → protected page access
- Redirect to login when unauthenticated
- Create a product through the UI
- Navigation (sidebar links work)

### 4. Package.json scripts

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui"
}
```

Root `package.json` addition:

```json
{
  "test": "turbo test",
  "test:e2e": "pnpm --filter web-tanstack test:e2e"
}
```

## Implementation order

### Step 1: Infrastructure setup
- Install `@cloudflare/vitest-pool-workers`
- Create `vitest.config.ts`, `test/apply-migrations.ts`, `test/env.d.ts`
- Write one smoke test that accesses `env.DB` and runs a query
- Verify the `@workspace/core` singleton DB pattern works in test pool
- Add test scripts to package.json

### Step 2: Service layer tests
- Create `test/helpers/seed.ts` with reusable seed functions
- Write tests for product CRUD (`test/services/products.test.ts`)
- Write tests for warehouse CRUD (`test/services/warehouses.test.ts`)
- Write tests for stock movements and metrics
- Write tests for chat CRUD (`test/services/chat.test.ts`)

### Step 3: API route tests
- Create `test/helpers/auth.ts` with test user/session helpers
- Write auth enforcement tests (401 without session)
- Write CRUD route tests with authenticated requests
- Write validation tests (bad payloads)

### Step 4: E2E tests
- Install Playwright, configure
- Write auth flow tests (signup, login, redirect)
- Write one CRUD flow (create product through UI)
- Write navigation test

## Open questions

1. **Does `cloudflare:workers` env resolve correctly inside `@workspace/core` when running in the test pool?** If not, services need refactoring to accept `db` as a parameter. This is the first thing to validate in Step 1.

2. **How does Better Auth validate sessions in tests?** The auth helper creates sessions directly in D1, but Better Auth may hash or sign tokens. We may need to use Better Auth's test utilities or call the signup API from tests instead.

3. **E2E database state:** Playwright tests run against the dev server which uses its own local D1. How to seed/reset between tests? Options: API endpoint for test seeding (dev only), or reset D1 before each test run.

4. **CI setup:** Workers tests should work in CI since miniflare is self-contained. E2E tests need a running dev server — the `webServer` config in Playwright handles this. May need Cloudflare account token for D1 in CI? Probably not since it's local-only.
