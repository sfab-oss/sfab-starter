import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: "./test/e2e",
  globalSetup: "./test/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["html"], ["list"]],
  use: {
    baseURL: "http://localhost:4011",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "setup",
      testMatch: "*.setup.ts",
    },
    {
      name: "authenticated",
      testMatch: "*.spec.ts",
      testIgnore: "auth.spec.ts",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: join(__dirname, "test/.auth/user.json"),
      },
    },
    {
      name: "unauthenticated",
      testMatch: "auth.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  webServer: {
    command: "pnpm db:reset && pnpm dev",
    port: 4011,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
