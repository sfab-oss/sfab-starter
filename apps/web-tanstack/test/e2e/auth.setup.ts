import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test as setup } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const authFile = join(__dirname, "../.auth/user.json");
const ONBOARDING_URL_PATTERN = /onboarding/;

setup("create authenticated user", async ({ page }) => {
  // Sign up a new user — wait for hydration before interacting
  await page.goto("/signup");
  await page.waitForLoadState("networkidle");
  await page.locator("input#name").fill("E2E Test User");
  await page.locator("input#email").fill("e2e-test@example.com");
  await page.locator("input#password").fill("TestPassword123!");
  await page.getByRole("button", { name: "Sign up" }).click();

  // Should redirect to onboarding
  await expect(page).toHaveURL(ONBOARDING_URL_PATTERN, { timeout: 10_000 });

  // Create an organization (name auto-fills the slug) — wait for hydration
  await page.waitForLoadState("networkidle");
  await page.locator("input#name").fill("E2E Test Org");
  await page.getByRole("button", { name: "Create Organization" }).click();

  // Should redirect to the dashboard
  await expect(page).toHaveURL("/", { timeout: 10_000 });

  // Save the authenticated state
  await page.context().storageState({ path: authFile });
});
