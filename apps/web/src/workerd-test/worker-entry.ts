/**
 * Test-worker entry for @cloudflare/vitest-pool-workers (ALW-305).
 *
 * This is the `main` for wrangler.test.jsonc and is NEVER deployed — production
 * still boots `src/server.ts` via wrangler.jsonc. Keeping a dedicated test entry
 * means the test-only fixtures (the TestCounter DO) and their DO migration never
 * touch the production wrangler config or migration ledger, and workerd never has
 * to bundle TanStack Start for tests.
 *
 * It serves both kinds of in-workerd test:
 *  - SELF-based API/integration tests hit the mounted Hono app (same shape the
 *    old `test/worker.ts` provided).
 *  - DO tests reach `TestCounter` through the TEST_COUNTER binding.
 */
import { Hono } from "hono";
import { cors } from "hono/cors";
import { app as honoApp } from "../hono";

export { TestCounter } from "./test-counter-do";

const app = new Hono()
  .use("*", cors())
  .route("/api", honoApp)
  .all("*", (c) => c.text("Not found", 404));

export default { fetch: app.fetch };
