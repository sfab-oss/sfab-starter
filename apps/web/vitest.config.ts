import path from "node:path";
import {
  cloudflareTest,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig, type ViteUserConfig } from "vitest/config";

/**
 * ALW-305: two Vitest projects coexist in one config, split by where a test must
 * run:
 * - `node` — pure unit tests (money math, RBAC logic). Plain node environment,
 *   no bindings. Fast. Matches every `*.test.ts` that is NOT `*.workerd.test.ts`.
 * - `workers` — in-workerd tests via @cloudflare/vitest-pool-workers: the D1/R2
 *   API integration suite (SELF-based) and the DurableObject reference test.
 *   Runs against wrangler.test.jsonc (the test-only worker). Matches
 *   `*.workerd.test.ts`.
 *
 * Convention: a test needing `@workspace/db`, `env.DB`/`SELF`, or a DO binding is
 * named `*.workerd.test.ts`; everything else stays a plain `*.test.ts` unit test.
 *
 * `readD1Migrations` is read once and injected as the TEST_MIGRATIONS binding so
 * the `workers` setup file can apply the schema to the isolated per-test D1.
 */
export default defineConfig(async (): Promise<ViteUserConfig> => {
  const migrationsPath = path.join(__dirname, "../../packages/db/drizzle");
  const migrations = await readD1Migrations(migrationsPath);

  return {
    plugins: [tsconfigPaths({ projects: ["./tsconfig.json"] })],
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: "node",
            environment: "node",
            // Cover both trees so a pure unit test can't be silently un-run by
            // living outside `test/`; `*.workerd.test.ts` always routes to the
            // `workers` project instead.
            include: ["{test,src}/**/*.test.ts"],
            exclude: ["**/*.workerd.test.ts"],
          },
        },
        {
          extends: true,
          plugins: [
            tsconfigPaths({ projects: ["./tsconfig.json"] }),
            cloudflareTest({
              wrangler: { configPath: "./wrangler.test.jsonc" },
              miniflare: {
                bindings: { TEST_MIGRATIONS: migrations },
              },
            }),
          ],
          test: {
            name: "workers",
            include: ["{test,src}/**/*.workerd.test.ts"],
            setupFiles: ["./test/apply-migrations.ts"],
            testTimeout: 60_000,
          },
        },
      ],
    },
  };
});
