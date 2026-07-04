import { beforeEach, describe, expect, it } from "vitest";
import { seedOrganization, seedProduct, seedUser } from "../helpers/seed";

let orgId: string;

beforeEach(async () => {
  const user = await seedUser();
  const org = await seedOrganization(user.id);
  orgId = org.id;
});

describe("getPaginatedProducts", () => {
  it("returns paginated response with correct shape", async () => {
    await seedProduct(orgId, { name: "Product 1", sku: "P-1" });
    await seedProduct(orgId, { name: "Product 2", sku: "P-2" });

    const { getPaginatedProducts } = await import("@workspace/core/catalog");
    const result = await getPaginatedProducts(orgId, {
      page: 1,
      pageSize: 10,
    });

    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
  });

  it("respects page size limit", async () => {
    for (let i = 0; i < 5; i++) {
      await seedProduct(orgId, { name: `Product ${i}`, sku: `P-${i}` });
    }

    const { getPaginatedProducts } = await import("@workspace/core/catalog");
    const result = await getPaginatedProducts(orgId, {
      page: 1,
      pageSize: 3,
    });

    expect(result.data).toHaveLength(3);
    expect(result.total).toBe(5);
  });

  it("returns correct page offset", async () => {
    for (let i = 0; i < 5; i++) {
      await seedProduct(orgId, { name: `Product ${i}`, sku: `P-${i}` });
    }

    const { getPaginatedProducts } = await import("@workspace/core/catalog");
    const page1 = await getPaginatedProducts(orgId, {
      page: 1,
      pageSize: 3,
    });
    const page2 = await getPaginatedProducts(orgId, {
      page: 2,
      pageSize: 3,
    });

    expect(page1.data).toHaveLength(3);
    expect(page2.data).toHaveLength(2);

    const allNames = [...page1.data, ...page2.data].map((p) => p.name);
    expect(new Set(allNames).size).toBe(5);
  });

  it("filters by search term", async () => {
    await seedProduct(orgId, { name: "Alpha Widget", sku: "AW-001" });
    await seedProduct(orgId, { name: "Beta Gadget", sku: "BG-001" });

    const { getPaginatedProducts } = await import("@workspace/core/catalog");
    const result = await getPaginatedProducts(orgId, {
      page: 1,
      pageSize: 10,
      search: "Alpha",
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe("Alpha Widget");
    expect(result.total).toBe(1);
  });

  it("filters by SKU search", async () => {
    await seedProduct(orgId, { name: "Product A", sku: "SPECIAL-001" });
    await seedProduct(orgId, { name: "Product B", sku: "NORMAL-001" });

    const { getPaginatedProducts } = await import("@workspace/core/catalog");
    const result = await getPaginatedProducts(orgId, {
      page: 1,
      pageSize: 10,
      search: "SPECIAL",
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].sku).toBe("SPECIAL-001");
  });

  it("sorts by name ascending", async () => {
    await seedProduct(orgId, { name: "Zebra", sku: "Z-001" });
    await seedProduct(orgId, { name: "Apple", sku: "A-001" });

    const { getPaginatedProducts } = await import("@workspace/core/catalog");
    const result = await getPaginatedProducts(orgId, {
      page: 1,
      pageSize: 10,
      sortBy: "name",
      sortOrder: "asc",
    });

    expect(result.data[0].name).toBe("Apple");
    expect(result.data[1].name).toBe("Zebra");
  });

  it("sorts by name descending", async () => {
    await seedProduct(orgId, { name: "Zebra", sku: "Z-001" });
    await seedProduct(orgId, { name: "Apple", sku: "A-001" });

    const { getPaginatedProducts } = await import("@workspace/core/catalog");
    const result = await getPaginatedProducts(orgId, {
      page: 1,
      pageSize: 10,
      sortBy: "name",
      sortOrder: "desc",
    });

    expect(result.data[0].name).toBe("Zebra");
    expect(result.data[1].name).toBe("Apple");
  });

  it("does not return products from other orgs", async () => {
    const otherUser = await seedUser();
    const otherOrg = await seedOrganization(otherUser.id);
    await seedProduct(orgId, { name: "My Product", sku: "MP-001" });
    await seedProduct(otherOrg.id, { name: "Other Product", sku: "OP-001" });

    const { getPaginatedProducts } = await import("@workspace/core/catalog");
    const result = await getPaginatedProducts(orgId, {
      page: 1,
      pageSize: 10,
    });

    expect(result.total).toBe(1);
    expect(result.data[0].name).toBe("My Product");
  });

  it("returns empty result for page beyond data", async () => {
    await seedProduct(orgId, { name: "Only Product", sku: "OP-001" });

    const { getPaginatedProducts } = await import("@workspace/core/catalog");
    const result = await getPaginatedProducts(orgId, {
      page: 5,
      pageSize: 10,
    });

    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(1);
  });
});
