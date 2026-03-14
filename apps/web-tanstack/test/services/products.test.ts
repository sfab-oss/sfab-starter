import { beforeEach, describe, expect, it } from "vitest";
import { seedProduct, seedUser, seedWarehouse } from "../helpers/seed";

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

  it("includes aggregated stock total", async () => {
    const product = await seedProduct(userId);
    const wh1 = await seedWarehouse(userId, { name: "WH1" });
    const wh2 = await seedWarehouse(userId, { name: "WH2" });

    const { performStockMovement, getProducts } = await import(
      "@workspace/core/products"
    );

    await performStockMovement({
      userId,
      productId: product.id,
      type: "IN",
      quantity: 10,
      toWarehouseId: wh1.id,
    });
    await performStockMovement({
      userId,
      productId: product.id,
      type: "IN",
      quantity: 5,
      toWarehouseId: wh2.id,
    });

    const products = await getProducts(userId);
    expect(products[0].totalStock).toBe(15);
  });
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

describe("performStockMovement", () => {
  it("adds stock to a warehouse on IN movement", async () => {
    const product = await seedProduct(userId);
    const warehouse = await seedWarehouse(userId);

    const { performStockMovement, getProduct } = await import(
      "@workspace/core/products"
    );

    await performStockMovement({
      userId,
      productId: product.id,
      type: "IN",
      quantity: 25,
      toWarehouseId: warehouse.id,
    });

    const updated = await getProduct(product.id, userId);
    expect(updated.totalStock).toBe(25);
  });

  it("subtracts stock from a warehouse on OUT movement", async () => {
    const product = await seedProduct(userId);
    const warehouse = await seedWarehouse(userId);

    const { performStockMovement, getProduct } = await import(
      "@workspace/core/products"
    );

    // Stock in first
    await performStockMovement({
      userId,
      productId: product.id,
      type: "IN",
      quantity: 30,
      toWarehouseId: warehouse.id,
    });

    // Stock out
    await performStockMovement({
      userId,
      productId: product.id,
      type: "OUT",
      quantity: 10,
      fromWarehouseId: warehouse.id,
    });

    const updated = await getProduct(product.id, userId);
    expect(updated.totalStock).toBe(20);
  });

  it("transfers stock between warehouses", async () => {
    const product = await seedProduct(userId);
    const whFrom = await seedWarehouse(userId, { name: "From WH" });
    const whTo = await seedWarehouse(userId, { name: "To WH" });

    const { performStockMovement, getProduct } = await import(
      "@workspace/core/products"
    );

    // Initial stock in source warehouse
    await performStockMovement({
      userId,
      productId: product.id,
      type: "IN",
      quantity: 50,
      toWarehouseId: whFrom.id,
    });

    // Transfer
    await performStockMovement({
      userId,
      productId: product.id,
      type: "TRANSFER",
      quantity: 20,
      fromWarehouseId: whFrom.id,
      toWarehouseId: whTo.id,
    });

    // Total stock should remain the same
    const updated = await getProduct(product.id, userId);
    expect(updated.totalStock).toBe(50);
  });

  it("records movements in history", async () => {
    const product = await seedProduct(userId);
    const warehouse = await seedWarehouse(userId);

    const { performStockMovement, getProductMovements } = await import(
      "@workspace/core/products"
    );

    await performStockMovement({
      userId,
      productId: product.id,
      type: "IN",
      quantity: 10,
      toWarehouseId: warehouse.id,
      notes: "Initial stock",
    });

    const movements = await getProductMovements(product.id, userId);
    expect(movements).toHaveLength(1);
    expect(movements[0].type).toBe("IN");
    expect(movements[0].quantity).toBe(10);
    expect(movements[0].notes).toBe("Initial stock");
  });

  it("accumulates stock on repeated IN movements to same warehouse", async () => {
    const product = await seedProduct(userId);
    const warehouse = await seedWarehouse(userId);

    const { performStockMovement, getProduct } = await import(
      "@workspace/core/products"
    );

    await performStockMovement({
      userId,
      productId: product.id,
      type: "IN",
      quantity: 10,
      toWarehouseId: warehouse.id,
    });

    await performStockMovement({
      userId,
      productId: product.id,
      type: "IN",
      quantity: 15,
      toWarehouseId: warehouse.id,
    });

    const updated = await getProduct(product.id, userId);
    expect(updated.totalStock).toBe(25);
  });
});

describe("getProductMovements", () => {
  it("returns empty list when no movements exist", async () => {
    const product = await seedProduct(userId);
    const { getProductMovements } = await import("@workspace/core/products");
    const movements = await getProductMovements(product.id, userId);
    expect(movements).toHaveLength(0);
  });

  it("does not return movements from other users", async () => {
    const otherUser = await seedUser();
    const product = await seedProduct(userId);
    const warehouse = await seedWarehouse(userId);

    const { performStockMovement, getProductMovements } = await import(
      "@workspace/core/products"
    );

    await performStockMovement({
      userId,
      productId: product.id,
      type: "IN",
      quantity: 5,
      toWarehouseId: warehouse.id,
    });

    const movements = await getProductMovements(product.id, otherUser.id);
    expect(movements).toHaveLength(0);
  });
});

describe("getDashboardMetrics", () => {
  it("returns empty metrics for new user", async () => {
    const { getDashboardMetrics } = await import("@workspace/core/products");
    const metrics = await getDashboardMetrics(userId);
    expect(metrics.activeProducts).toHaveLength(0);
    expect(metrics.recentMovements).toHaveLength(0);
  });

  it("returns products and recent movements", async () => {
    const product = await seedProduct(userId);
    const warehouse = await seedWarehouse(userId);

    const { performStockMovement, getDashboardMetrics } = await import(
      "@workspace/core/products"
    );

    await performStockMovement({
      userId,
      productId: product.id,
      type: "IN",
      quantity: 10,
      toWarehouseId: warehouse.id,
    });

    const metrics = await getDashboardMetrics(userId);
    expect(metrics.activeProducts).toHaveLength(1);
    expect(metrics.recentMovements).toHaveLength(1);
  });
});
