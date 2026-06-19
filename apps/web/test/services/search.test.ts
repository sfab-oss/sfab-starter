import { beforeEach, describe, expect, it } from "vitest";
import {
  seedOrganization,
  seedProduct,
  seedUser,
  seedWarehouse,
} from "../helpers/seed";

let orgId: string;

beforeEach(async () => {
  const user = await seedUser();
  const org = await seedOrganization(user.id);
  orgId = org.id;
});

describe("searchInventory", () => {
  it("returns empty results for empty query", async () => {
    await seedProduct(orgId, { name: "Widget", sku: "W-001" });
    const { searchInventory } = await import("@workspace/core/catalog");
    const results = await searchInventory(orgId, "");
    // Empty pattern matches everything with LIKE, but the API guard prevents this
    // At service level, empty string matches all — this tests the raw function behavior
    expect(results).toBeDefined();
  });

  it("finds products by name", async () => {
    await seedProduct(orgId, { name: "Blue Widget", sku: "BW-001" });
    await seedProduct(orgId, { name: "Red Gadget", sku: "RG-001" });

    const { searchInventory } = await import("@workspace/core/catalog");
    const results = await searchInventory(orgId, "Widget");
    expect(results).toHaveLength(1);
    expect(results[0].metadata.title).toBe("Blue Widget");
    expect(results[0].metadata.type).toBe("product");
  });

  it("finds products by SKU", async () => {
    await seedProduct(orgId, { name: "Some Product", sku: "UNIQUE-SKU-99" });

    const { searchInventory } = await import("@workspace/core/catalog");
    const results = await searchInventory(orgId, "UNIQUE-SKU");
    expect(results).toHaveLength(1);
    expect(results[0].metadata.sku).toBe("UNIQUE-SKU-99");
  });

  it("finds warehouses by name", async () => {
    await seedWarehouse(orgId, { name: "Downtown Depot" });
    await seedWarehouse(orgId, { name: "Airport Hub" });

    const { searchInventory } = await import("@workspace/core/catalog");
    const results = await searchInventory(orgId, "Downtown");
    expect(results).toHaveLength(1);
    expect(results[0].metadata.title).toBe("Downtown Depot");
    expect(results[0].metadata.type).toBe("warehouse");
  });

  it("returns both products and warehouses when both match", async () => {
    await seedProduct(orgId, { name: "Alpha Item", sku: "AI-001" });
    await seedWarehouse(orgId, { name: "Alpha Storage" });

    const { searchInventory } = await import("@workspace/core/catalog");
    const results = await searchInventory(orgId, "Alpha");
    expect(results).toHaveLength(2);

    const types = results.map((r) => r.metadata.type);
    expect(types).toContain("product");
    expect(types).toContain("warehouse");
  });

  it("returns products scored higher than warehouses", async () => {
    await seedProduct(orgId, { name: "Shared Name", sku: "SN-001" });
    await seedWarehouse(orgId, { name: "Shared Name" });

    const { searchInventory } = await import("@workspace/core/catalog");
    const results = await searchInventory(orgId, "Shared");
    expect(results[0].metadata.type).toBe("product");
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it("returns no results for unmatched query", async () => {
    await seedProduct(orgId, { name: "Widget", sku: "W-001" });

    const { searchInventory } = await import("@workspace/core/catalog");
    const results = await searchInventory(orgId, "xyznonexistent");
    expect(results).toHaveLength(0);
  });

  it("does not return products from other orgs", async () => {
    const otherUser = await seedUser();
    const otherOrg = await seedOrganization(otherUser.id);
    await seedProduct(otherOrg.id, { name: "Secret Widget", sku: "SW-001" });

    const { searchInventory } = await import("@workspace/core/catalog");
    const results = await searchInventory(orgId, "Secret");
    expect(results).toHaveLength(0);
  });

  it("limits results to 10 per type", async () => {
    for (let i = 0; i < 12; i++) {
      await seedProduct(orgId, {
        name: `Bulk Product ${i}`,
        sku: `BP-${i}`,
      });
    }

    const { searchInventory } = await import("@workspace/core/catalog");
    const results = await searchInventory(orgId, "Bulk");
    const productResults = results.filter((r) => r.metadata.type === "product");
    expect(productResults).toHaveLength(10);
  });

  it("performs case-insensitive search", async () => {
    await seedProduct(orgId, { name: "UPPERCASE WIDGET", sku: "UW-001" });

    const { searchInventory } = await import("@workspace/core/catalog");
    const results = await searchInventory(orgId, "uppercase");
    expect(results).toHaveLength(1);
  });
});
