import { expect, test } from "@playwright/test";

const INVENTORY_DETAIL_URL_PATTERN = /\/inventory\/.+/;

// Create a small valid PNG in memory for tests
function createTestPngBuffer(): Buffer {
  // Minimal 1x1 blue PNG
  const header = Buffer.from("89504e470d0a1a0a", "hex");
  const ihdr = createPngChunk(
    "IHDR",
    Buffer.from("0000000100000001080200000000", "hex")
  );
  const idat = createPngChunk(
    "IDAT",
    Buffer.from("0800d7638060c0060000020001e221bc33", "hex")
  );
  const iend = createPngChunk("IEND", Buffer.alloc(0));
  return Buffer.concat([header, ihdr, idat, iend]);
}

function createPngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuffer = Buffer.from(type, "ascii");
  const crcInput = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([len, typeBuffer, data, crc]);
}

function crc32(buf: Buffer): number {
  let c = 0xff_ff_ff_ff;
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ crcTable[(c ^ buf[i]) & 0xff];
  }
  return (c ^ 0xff_ff_ff_ff) >>> 0;
}

const crcTable: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xed_b8_83_20 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

test.describe("product image upload", () => {
  test("shows upload drop zone in create dialog", async ({ page }) => {
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Add Product" }).click();
    await expect(
      page.getByRole("heading", { name: "Add New Product" })
    ).toBeVisible({ timeout: 10_000 });

    // The image upload area should be visible
    await expect(
      page.getByText("Click or drag an image to upload")
    ).toBeVisible();
    await expect(
      page.getByText("JPEG, PNG, WebP, GIF, SVG up to 5 MB")
    ).toBeVisible();
  });

  test("can upload an image and see preview", async ({ page }) => {
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Add Product" }).click();
    await expect(
      page.getByRole("heading", { name: "Add New Product" })
    ).toBeVisible({ timeout: 10_000 });

    // Upload a test image via the hidden file input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "test-product.png",
      mimeType: "image/png",
      buffer: createTestPngBuffer(),
    });

    // Wait for upload to complete — the preview image should appear
    await expect(page.locator('img[alt="Product"]')).toBeVisible({
      timeout: 10_000,
    });

    // The "Remove" button should be available (visible on hover)
    const removeButton = page.getByRole("button", { name: "Remove" });
    await expect(removeButton).toBeAttached();
  });

  test("can create a product with an image and view it on detail page", async ({
    page,
  }) => {
    const productName = `Upload Product ${Date.now()}`;
    const productSku = `UP-${Date.now()}`;

    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Add Product" }).click();
    await expect(
      page.getByRole("heading", { name: "Add New Product" })
    ).toBeVisible({ timeout: 10_000 });

    // Upload image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "product-photo.png",
      mimeType: "image/png",
      buffer: createTestPngBuffer(),
    });
    await expect(page.locator('img[alt="Product"]')).toBeVisible({
      timeout: 10_000,
    });

    // Fill product form
    await page.locator("input#name").fill(productName);
    await page.locator("input#sku").fill(productSku);
    await page.locator("input#price").fill("49.99");
    await page.locator("input#minStockLevel").fill("10");

    // Submit
    await page.getByRole("button", { name: "Save Product" }).click();

    // Verify product appears in inventory list
    await expect(page.getByText(productName)).toBeVisible({
      timeout: 10_000,
    });

    // Navigate to product detail page
    await page.getByRole("link", { name: productName }).click();
    await expect(page).toHaveURL(INVENTORY_DETAIL_URL_PATTERN);

    // The product image should be displayed on the detail page
    const detailImage = page.locator(`img[alt="${productName}"]`);
    await expect(detailImage).toBeVisible({ timeout: 10_000 });

    // Verify the image src points to our uploads endpoint
    const src = await detailImage.getAttribute("src");
    expect(src).toContain("/api/protected/inventory/uploads/");
  });

  test("shows image in edit mode with existing image", async ({ page }) => {
    const productName = `Edit Image Product ${Date.now()}`;
    const productSku = `EI-${Date.now()}`;

    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    // Create product with image
    await page.getByRole("button", { name: "Add Product" }).click();
    await expect(
      page.getByRole("heading", { name: "Add New Product" })
    ).toBeVisible({ timeout: 10_000 });

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "edit-test.png",
      mimeType: "image/png",
      buffer: createTestPngBuffer(),
    });
    await expect(page.locator('img[alt="Product"]')).toBeVisible({
      timeout: 10_000,
    });

    await page.locator("input#name").fill(productName);
    await page.locator("input#sku").fill(productSku);
    await page.locator("input#price").fill("19.99");
    await page.getByRole("button", { name: "Save Product" }).click();

    // Navigate to detail page
    await expect(page.getByText(productName)).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole("link", { name: productName }).click();
    await expect(page).toHaveURL(INVENTORY_DETAIL_URL_PATTERN);

    // Click Edit
    await page.getByRole("button", { name: "Edit" }).click();

    // The image should be pre-populated in the edit form
    const editImage = page.locator('img[alt="Product"]');
    await expect(editImage).toBeVisible({ timeout: 10_000 });

    // The image src should point to our uploads endpoint
    const src = await editImage.getAttribute("src");
    expect(src).toContain("/api/protected/inventory/uploads/");
  });

  test("can remove an uploaded image before saving", async ({ page }) => {
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Add Product" }).click();
    await expect(
      page.getByRole("heading", { name: "Add New Product" })
    ).toBeVisible({ timeout: 10_000 });

    // Upload image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "remove-test.png",
      mimeType: "image/png",
      buffer: createTestPngBuffer(),
    });
    await expect(page.locator('img[alt="Product"]')).toBeVisible({
      timeout: 10_000,
    });

    // Hover over the image container to reveal remove button, then click it
    await page.locator('img[alt="Product"]').locator("..").hover();
    await page.getByRole("button", { name: "Remove" }).click({ force: true });

    // Image should be gone, drop zone should reappear
    await expect(page.locator('img[alt="Product"]')).not.toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByText("Click or drag an image to upload")
    ).toBeVisible();
  });

  test("can create a product without an image", async ({ page }) => {
    const productName = `No Image Product ${Date.now()}`;
    const productSku = `NI-${Date.now()}`;

    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Add Product" }).click();
    await expect(
      page.getByRole("heading", { name: "Add New Product" })
    ).toBeVisible({ timeout: 10_000 });

    // Fill form without uploading an image
    await page.locator("input#name").fill(productName);
    await page.locator("input#sku").fill(productSku);
    await page.locator("input#price").fill("9.99");
    await page.getByRole("button", { name: "Save Product" }).click();

    // Verify product appears
    await expect(page.getByText(productName)).toBeVisible({
      timeout: 10_000,
    });

    // Navigate to detail — no image should be shown
    await page.getByRole("link", { name: productName }).click();
    await expect(page).toHaveURL(INVENTORY_DETAIL_URL_PATTERN);
    await expect(page.locator(`img[alt="${productName}"]`)).not.toBeVisible();
  });
});
