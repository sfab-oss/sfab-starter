import { expect, test } from "@playwright/test";

const INVENTORY_DETAIL_URL_PATTERN = /\/inventory\/.+/;

test.describe("inventory products", () => {
  const productName = `E2E Product ${Date.now()}`;
  const productSku = `E2E-${Date.now()}`;

  test("can create a product", async ({ page }) => {
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    // Open the create product dialog
    await page.getByRole("button", { name: "Add Product" }).click();
    await expect(
      page.getByRole("heading", { name: "Add New Product" })
    ).toBeVisible({ timeout: 10_000 });

    // Fill the product form
    await page.locator("input#name").fill(productName);
    await page.locator("input#sku").fill(productSku);
    await page.locator("input#price").fill("29.99");
    await page.locator("input#minStockLevel").fill("10");

    // Submit
    await page.getByRole("button", { name: "Save Product" }).click();

    // Verify the product appears in the table
    await expect(page.getByText(productName)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("can view product details", async ({ page }) => {
    // First create a product to ensure one exists
    const detailProductName = `Detail Product ${Date.now()}`;
    const detailProductSku = `DET-${Date.now()}`;

    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Add Product" }).click();
    await expect(
      page.getByRole("heading", { name: "Add New Product" })
    ).toBeVisible({ timeout: 10_000 });

    await page.locator("input#name").fill(detailProductName);
    await page.locator("input#sku").fill(detailProductSku);
    await page.locator("input#price").fill("15.00");
    await page.locator("input#minStockLevel").fill("5");
    await page.getByRole("button", { name: "Save Product" }).click();

    // Wait for the product to appear, then click its name
    await expect(page.getByText(detailProductName)).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole("link", { name: detailProductName }).click();

    // Verify we're on the product detail page
    await expect(page).toHaveURL(INVENTORY_DETAIL_URL_PATTERN);
    await expect(page.getByText(detailProductName)).toBeVisible();
  });
});
