// biome-ignore lint/style/noNamespace: Required by Cloudflare's typing pattern
declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    R2_BUCKET: R2Bucket;
    TEST_MIGRATIONS: import("cloudflare:test").D1Migration[];
  }
}
