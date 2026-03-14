import { beforeEach, describe, expect, it } from "vitest";
import { seedProduct, seedUser } from "../helpers/seed";

let userId: string;

beforeEach(async () => {
  const user = await seedUser();
  userId = user.id;
});

describe("getProducts", () => {
  it("returns empty list when no products exist", async () => {
    const { getProducts } = await import("@workspace/core/products");
    const products = await getProducts(userId);
    expect(products).toHaveLength(0);
  });

  it("returns products for the user", async () => {
    await seedProduct(userId, { name: "Product A", sku: "SKU-A" });
    await seedProduct(userId, { name: "Product B", sku: "SKU-B" });

    const { getProducts } = await import("@workspace/core/products");
    const products = await getProducts(userId);
    expect(products).toHaveLength(2);
    expect(products.map((p) => p.name)).toContain("Product A");
    expect(products.map((p) => p.name)).toContain("Product B");
  });

  it("does not return products from other users", async () => {
    const otherUser = await seedUser();
    await seedProduct(userId, { name: "My Product" });
    await seedProduct(otherUser.id, { name: "Other Product" });

    const { getProducts } = await import("@workspace/core/products");
    const products = await getProducts(userId);
    expect(products).toHaveLength(1);
    expect(products[0].name).toBe("My Product");
  });

  // Depends on performStockMovement which requires the missing UNIQUE constraint
  it.todo("includes aggregated stock total");
});

describe("getProduct", () => {
  it("returns a single product by id", async () => {
    const seeded = await seedProduct(userId, { name: "Specific Product" });
    const { getProduct } = await import("@workspace/core/products");
    const product = await getProduct(seeded.id, userId);
    expect(product).toBeDefined();
    expect(product.name).toBe("Specific Product");
  });

  it("returns undefined for non-existent product", async () => {
    const { getProduct } = await import("@workspace/core/products");
    const product = await getProduct("non-existent", userId);
    expect(product).toBeUndefined();
  });

  it("returns undefined if product belongs to another user", async () => {
    const otherUser = await seedUser();
    const seeded = await seedProduct(otherUser.id);
    const { getProduct } = await import("@workspace/core/products");
    const product = await getProduct(seeded.id, userId);
    expect(product).toBeUndefined();
  });
});

describe("createProduct", () => {
  it("creates a product with required fields", async () => {
    const { createProduct } = await import("@workspace/core/products");
    const result = await createProduct({
      userId,
      sku: "NEW-SKU",
      name: "New Product",
    });
    expect(result).toHaveLength(1);
    expect(result[0].sku).toBe("NEW-SKU");
    expect(result[0].name).toBe("New Product");
    expect(result[0].userId).toBe(userId);
  });

  it("creates a product with optional fields", async () => {
    const { createProduct } = await import("@workspace/core/products");
    const result = await createProduct({
      userId,
      sku: "FULL-SKU",
      name: "Full Product",
      description: "A description",
      price: 49.99,
      minStockLevel: 20,
    });
    expect(result[0].description).toBe("A description");
    expect(result[0].price).toBe("49.99");
    expect(result[0].minStockLevel).toBe(20);
  });
});

describe("updateProduct", () => {
  it("updates product fields", async () => {
    const seeded = await seedProduct(userId, { name: "Original" });
    const { updateProduct } = await import("@workspace/core/products");
    const updated = await updateProduct(seeded.id, userId, {
      name: "Updated",
    });
    expect(updated.name).toBe("Updated");
  });

  it("returns undefined when updating non-existent product", async () => {
    const { updateProduct } = await import("@workspace/core/products");
    const result = await updateProduct("non-existent", userId, {
      name: "Nope",
    });
    expect(result).toBeUndefined();
  });
});

describe("deleteProduct", () => {
  it("deletes a product and returns it", async () => {
    const seeded = await seedProduct(userId, { name: "To Delete" });
    const { deleteProduct, getProduct } = await import(
      "@workspace/core/products"
    );
    const deleted = await deleteProduct(seeded.id, userId);
    expect(deleted.name).toBe("To Delete");

    const found = await getProduct(seeded.id, userId);
    expect(found).toBeUndefined();
  });

  it("returns undefined when deleting non-existent product", async () => {
    const { deleteProduct } = await import("@workspace/core/products");
    const result = await deleteProduct("non-existent", userId);
    expect(result).toBeUndefined();
  });
});

// BUG: stock_levels table is missing a UNIQUE constraint on (product_id, warehouse_id).
// The performStockMovement service uses onConflictDoUpdate which requires this constraint.
// These tests are skipped until the schema is fixed with a migration adding:
//   CREATE UNIQUE INDEX stock_levels_product_warehouse ON stock_levels (product_id, warehouse_id);
describe.todo("performStockMovement — blocked on missing UNIQUE constraint", () => {
  it.todo("adds stock to a warehouse on IN movement");
  it.todo("subtracts stock from a warehouse on OUT movement");
  it.todo("transfers stock between warehouses");
  it.todo("records movements in history");
});
