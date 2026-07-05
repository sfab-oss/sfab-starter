/**
 * Typed accessor for the in-workerd test worker's bindings (ALW-305).
 *
 * The test-only fixture (TestCounter DO) is declared in wrangler.test.jsonc —
 * NOT the production wrangler.jsonc / cf-typegen output — so it is intentionally
 * absent from the global `Cloudflare.Env` type, and prod code can't accidentally
 * reference it. The pool-workers runtime still populates it on `env` at run time;
 * this module re-exports `env` with the fixture binding typed, keeping the test
 * surface out of the production type graph.
 */
import { env as runtimeEnv } from "cloudflare:workers";
import type { TestCounter } from "./test-counter-do";

export const env = runtimeEnv as typeof runtimeEnv & {
  TEST_COUNTER: DurableObjectNamespace<TestCounter>;
};
