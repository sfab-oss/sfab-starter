import { beforeEach, describe, expect, it } from "vitest";
import { seedOrganization, seedProduct, seedUser } from "../helpers/seed";

let orgId: string;

beforeEach(async () => {
  const user = await seedUser();
  const org = await seedOrganization(user.id);
  orgId = org.id;
});

describe("getProducts", () => {
  it("returns empty list when no products exist", async () => {
    const { getProducts } = await import("@workspace/core/catalog");
    const products = await getProducts(orgId);
    expect(products).toHaveLength(0);
  });

  it("returns products for the org", async () => {
    await seedProduct(orgId, { name: "Product A", sku: "SKU-A" });
    await seedProduct(orgId, { name: "Product B", sku: "SKU-B" });

    const { getProducts } = await import("@workspace/core/catalog");
    const products = await getProducts(orgId);
    expect(products).toHaveLength(2);
    expect(products.map((p) => p.name)).toContain("Product A");
    expect(products.map((p) => p.name)).toContain("Product B");
  });

  it("does not return products from other orgs", async () => {
    const otherUser = await seedUser();
    const otherOrg = await seedOrganization(otherUser.id);
    await seedProduct(orgId, { name: "My Product" });
    await seedProduct(otherOrg.id, { name: "Other Product" });

    const { getProducts } = await import("@workspace/core/catalog");
    const products = await getProducts(orgId);
    expect(products).toHaveLength(1);
    expect(products[0].name).toBe("My Product");
  });
});

describe("getProduct", () => {
  it("returns a single product by id", async () => {
    const seeded = await seedProduct(orgId, { name: "Specific Product" });
    const { getProduct } = await import("@workspace/core/catalog");
    const product = await getProduct(seeded.id, orgId);
    expect(product).toBeDefined();
    expect(product.name).toBe("Specific Product");
  });

  it("returns undefined for non-existent product", async () => {
    const { getProduct } = await import("@workspace/core/catalog");
    const product = await getProduct("non-existent", orgId);
    expect(product).toBeUndefined();
  });

  it("returns undefined if product belongs to another org", async () => {
    const otherUser = await seedUser();
    const otherOrg = await seedOrganization(otherUser.id);
    const seeded = await seedProduct(otherOrg.id);
    const { getProduct } = await import("@workspace/core/catalog");
    const product = await getProduct(seeded.id, orgId);
    expect(product).toBeUndefined();
  });
});

describe("createProduct", () => {
  it("creates a product with required fields", async () => {
    const { createProduct } = await import("@workspace/core/catalog");
    const result = await createProduct({
      orgId,
      sku: "NEW-SKU",
      name: "New Product",
    });
    expect(result).toHaveLength(1);
    expect(result[0].sku).toBe("NEW-SKU");
    expect(result[0].name).toBe("New Product");
    expect(result[0].organizationId).toBe(orgId);
  });

  it("creates a product with optional fields", async () => {
    const { createProduct } = await import("@workspace/core/catalog");
    const result = await createProduct({
      orgId,
      sku: "FULL-SKU",
      name: "Full Product",
      description: "A description",
      price: 4999,
      minStockLevel: 20,
    });
    expect(result[0].description).toBe("A description");
    expect(result[0].price).toBe(4999);
    expect(result[0].minStockLevel).toBe(20);
  });
});

describe("updateProduct", () => {
  it("updates product fields", async () => {
    const seeded = await seedProduct(orgId, { name: "Original" });
    const { updateProduct } = await import("@workspace/core/catalog");
    const updated = await updateProduct(seeded.id, orgId, {
      name: "Updated",
    });
    expect(updated.name).toBe("Updated");
  });

  it("returns undefined when updating non-existent product", async () => {
    const { updateProduct } = await import("@workspace/core/catalog");
    const result = await updateProduct("non-existent", orgId, {
      name: "Nope",
    });
    expect(result).toBeUndefined();
  });

  it("cannot update another org's product", async () => {
    const otherUser = await seedUser();
    const otherOrg = await seedOrganization(otherUser.id);
    const seeded = await seedProduct(otherOrg.id, {
      name: "Other Org Product",
    });

    const { updateProduct, getProduct } = await import(
      "@workspace/core/catalog"
    );
    const result = await updateProduct(seeded.id, orgId, { name: "Hacked" });
    expect(result).toBeUndefined();

    const unchanged = await getProduct(seeded.id, otherOrg.id);
    expect(unchanged.name).toBe("Other Org Product");
  });
});

describe("deleteProduct", () => {
  it("deletes a product and returns it", async () => {
    const seeded = await seedProduct(orgId, { name: "To Delete" });
    const { deleteProduct, getProduct } = await import(
      "@workspace/core/catalog"
    );
    const deleted = await deleteProduct(seeded.id, orgId);
    expect(deleted.name).toBe("To Delete");

    const found = await getProduct(seeded.id, orgId);
    expect(found).toBeUndefined();
  });

  it("returns undefined when deleting non-existent product", async () => {
    const { deleteProduct } = await import("@workspace/core/catalog");
    const result = await deleteProduct("non-existent", orgId);
    expect(result).toBeUndefined();
  });

  it("cannot delete another org's product", async () => {
    const otherUser = await seedUser();
    const otherOrg = await seedOrganization(otherUser.id);
    const seeded = await seedProduct(otherOrg.id, { name: "Protected" });

    const { deleteProduct, getProduct } = await import(
      "@workspace/core/catalog"
    );
    const result = await deleteProduct(seeded.id, orgId);
    expect(result).toBeUndefined();

    const stillExists = await getProduct(seeded.id, otherOrg.id);
    expect(stillExists).toBeDefined();
  });
});
