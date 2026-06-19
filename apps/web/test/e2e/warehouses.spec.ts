import { expect, test } from "@playwright/test";

const WAREHOUSE_DETAIL_URL_PATTERN = /\/inventory\/warehouses\/.+/;

test.describe("warehouses", () => {
  test("can create a warehouse", async ({ page }) => {
    const warehouseName = `E2E Warehouse ${Date.now()}`;

    await page.goto("/inventory/warehouses");
    await page.waitForLoadState("networkidle");

    // Open the create warehouse dialog
    await page.getByRole("button", { name: "Add Warehouse" }).click();
    await expect(
      page.getByRole("heading", { name: "Add New Warehouse" })
    ).toBeVisible({ timeout: 10_000 });

    // Fill the warehouse form
    await page.locator("input#name").fill(warehouseName);
    await page.locator("input#location").fill("Test Location");

    // Submit
    await page.getByRole("button", { name: "Save Warehouse" }).click();

    // Verify the warehouse appears in the table
    await expect(page.getByText(warehouseName)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("can view warehouse details", async ({ page }) => {
    const detailWarehouseName = `Detail Warehouse ${Date.now()}`;

    await page.goto("/inventory/warehouses");
    await page.waitForLoadState("networkidle");

    // Create a warehouse first
    await page.getByRole("button", { name: "Add Warehouse" }).click();
    await expect(
      page.getByRole("heading", { name: "Add New Warehouse" })
    ).toBeVisible({ timeout: 10_000 });

    await page.locator("input#name").fill(detailWarehouseName);
    await page.locator("input#location").fill("Detail Location");
    await page.getByRole("button", { name: "Save Warehouse" }).click();

    // Wait for it to appear, then click its name
    await expect(page.getByText(detailWarehouseName)).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole("link", { name: detailWarehouseName }).click();

    // Verify we're on the warehouse detail page
    await expect(page).toHaveURL(WAREHOUSE_DETAIL_URL_PATTERN);
    await expect(page.getByText(detailWarehouseName)).toBeVisible();
  });
});
