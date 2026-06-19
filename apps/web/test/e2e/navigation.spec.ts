import { expect, test } from "@playwright/test";

test.describe("navigation", () => {
  test("dashboard loads after login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/");
  });

  test("sidebar navigates to Inventory", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Inventory" }).click();
    await expect(page).toHaveURL("/inventory");
  });

  test("sidebar navigates to Warehouses", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Warehouses" }).click();
    await expect(page).toHaveURL("/inventory/warehouses");
  });

  test("sidebar navigates to Settings", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL("/settings");
  });

  test("sidebar navigates back to Home", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("link", { name: "Home" }).first().click();
    await expect(page).toHaveURL("/");
  });
});
