import { expect, test } from "@playwright/test";

const LOGIN_URL_PATTERN = /login/;
const ONBOARDING_URL_PATTERN = /onboarding/;

test.describe("auth guards", () => {
  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto("/inventory");
    await expect(page).toHaveURL(LOGIN_URL_PATTERN, { timeout: 10_000 });
  });

  test("unauthenticated user cannot access dashboard", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(LOGIN_URL_PATTERN, { timeout: 10_000 });
  });
});

test.describe("signup flow", () => {
  test("can sign up a new account", async ({ page }) => {
    const uniqueEmail = `signup-${Date.now()}@test.com`;

    await page.goto("/signup");
    await page.waitForLoadState("networkidle");
    await page.locator("input#name").fill("Signup Test User");
    await page.locator("input#email").fill(uniqueEmail);
    await page.locator("input#password").fill("TestPassword123!");
    await page.getByRole("button", { name: "Sign up" }).click();

    await expect(page).toHaveURL(ONBOARDING_URL_PATTERN, { timeout: 10_000 });
  });
});

test.describe("login flow", () => {
  const loginEmail = `login-${Date.now()}@test.com`;
  const loginPassword = "TestPassword123!";

  test("can log in with existing credentials", async ({ page }) => {
    // First, create a user via signup + onboarding
    await page.goto("/signup");
    await page.waitForLoadState("networkidle");
    await page.locator("input#name").fill("Login Test User");
    await page.locator("input#email").fill(loginEmail);
    await page.locator("input#password").fill(loginPassword);
    await page.getByRole("button", { name: "Sign up" }).click();
    await expect(page).toHaveURL(ONBOARDING_URL_PATTERN, { timeout: 10_000 });

    // Complete onboarding
    await page.waitForLoadState("networkidle");
    await page.locator("input#name").fill("Login Test Org");
    await page.getByRole("button", { name: "Create Organization" }).click();
    await expect(page).toHaveURL("/", { timeout: 10_000 });

    // Now navigate to login page directly (fresh context without cookies)
    await page.context().clearCookies();
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Log in with the credentials
    await page.locator("input#email").fill(loginEmail);
    await page.locator("input#password").fill(loginPassword);
    await page.getByRole("button", { name: "Login" }).click();

    await expect(page).toHaveURL("/", { timeout: 10_000 });
  });
});
