/// <reference path="./worker-configuration.d.ts" />
/// <reference types="@cloudflare/vitest-pool-workers/types" />

/**
 * ALW-305: vitest pool-workers exposes bindings on `env` from
 * `cloudflare:workers`. Extend ProvidedEnv so in-workerd tests type-check against
 * our production wrangler bindings (DB, R2_BUCKET).
 *
 * Test-only fixture bindings (TEST_COUNTER) are NOT added here: they live in
 * wrangler.test.jsonc and are typed locally via src/workerd-test/test-env.ts,
 * keeping them out of the production type graph.
 */
declare module "cloudflare:workers" {
  interface ProvidedEnv extends Cloudflare.Env {}
}
