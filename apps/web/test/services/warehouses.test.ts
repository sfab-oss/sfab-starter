import { beforeEach, describe, expect, it } from "vitest";
import { seedOrganization, seedUser, seedWarehouse } from "../helpers/seed";

let orgId: string;

beforeEach(async () => {
  const user = await seedUser();
  const org = await seedOrganization(user.id);
  orgId = org.id;
});

describe("getWarehouses", () => {
  it("returns empty list when no warehouses exist", async () => {
    const { getWarehouses } = await import("@workspace/core/catalog");
    const warehouses = await getWarehouses(orgId);
    expect(warehouses).toHaveLength(0);
  });

  it("returns warehouses ordered by name", async () => {
    await seedWarehouse(orgId, { name: "Zeta Warehouse" });
    await seedWarehouse(orgId, { name: "Alpha Warehouse" });

    const { getWarehouses } = await import("@workspace/core/catalog");
    const warehouses = await getWarehouses(orgId);
    expect(warehouses).toHaveLength(2);
    expect(warehouses[0].name).toBe("Alpha Warehouse");
    expect(warehouses[1].name).toBe("Zeta Warehouse");
  });

  it("does not return warehouses from other orgs", async () => {
    const otherUser = await seedUser();
    const otherOrg = await seedOrganization(otherUser.id);
    await seedWarehouse(orgId, { name: "My Warehouse" });
    await seedWarehouse(otherOrg.id, { name: "Other Warehouse" });

    const { getWarehouses } = await import("@workspace/core/catalog");
    const warehouses = await getWarehouses(orgId);
    expect(warehouses).toHaveLength(1);
    expect(warehouses[0].name).toBe("My Warehouse");
  });
});

describe("getWarehouse", () => {
  it("returns a warehouse by id", async () => {
    const seeded = await seedWarehouse(orgId, { name: "Specific" });
    const { getWarehouse } = await import("@workspace/core/catalog");
    const warehouse = await getWarehouse(seeded.id, orgId);
    expect(warehouse).toBeDefined();
    expect(warehouse.name).toBe("Specific");
  });

  it("returns undefined for non-existent warehouse", async () => {
    const { getWarehouse } = await import("@workspace/core/catalog");
    const warehouse = await getWarehouse("non-existent", orgId);
    expect(warehouse).toBeUndefined();
  });
});

describe("getDefaultWarehouse", () => {
  it("returns the default warehouse", async () => {
    await seedWarehouse(orgId, { name: "Regular", isDefault: false });
    await seedWarehouse(orgId, { name: "Default", isDefault: true });

    const { getDefaultWarehouse } = await import("@workspace/core/catalog");
    const warehouse = await getDefaultWarehouse(orgId);
    expect(warehouse).toBeDefined();
    expect(warehouse.name).toBe("Default");
  });

  it("returns undefined when no default exists", async () => {
    await seedWarehouse(orgId, { isDefault: false });
    const { getDefaultWarehouse } = await import("@workspace/core/catalog");
    const warehouse = await getDefaultWarehouse(orgId);
    expect(warehouse).toBeUndefined();
  });
});

describe("createWarehouse", () => {
  it("creates a warehouse", async () => {
    const { createWarehouse } = await import("@workspace/core/catalog");
    const warehouse = await createWarehouse({
      orgId,
      name: "New Warehouse",
      location: "Building A",
      isDefault: false,
    });
    expect(warehouse.name).toBe("New Warehouse");
    expect(warehouse.location).toBe("Building A");
  });

  it("unsets other defaults when creating a default warehouse", async () => {
    const { createWarehouse, getWarehouses } = await import(
      "@workspace/core/catalog"
    );

    await createWarehouse({
      orgId,
      name: "First Default",
      isDefault: true,
    });

    await createWarehouse({
      orgId,
      name: "New Default",
      isDefault: true,
    });

    const warehouses = await getWarehouses(orgId);
    const defaults = warehouses.filter((w) => w.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].name).toBe("New Default");
  });
});

describe("updateWarehouse", () => {
  it("updates warehouse fields", async () => {
    const seeded = await seedWarehouse(orgId, { name: "Original" });
    const { updateWarehouse } = await import("@workspace/core/catalog");
    const updated = await updateWarehouse(seeded.id, orgId, {
      name: "Updated",
    });
    expect(updated.name).toBe("Updated");
  });

  it("cannot update another org's warehouse", async () => {
    const otherUser = await seedUser();
    const otherOrg = await seedOrganization(otherUser.id);
    const seeded = await seedWarehouse(otherOrg.id, { name: "Other WH" });

    const { updateWarehouse, getWarehouse } = await import(
      "@workspace/core/catalog"
    );
    const result = await updateWarehouse(seeded.id, orgId, { name: "Hacked" });
    expect(result).toBeUndefined();

    const unchanged = await getWarehouse(seeded.id, otherOrg.id);
    expect(unchanged.name).toBe("Other WH");
  });

  it("unsets other defaults when making a warehouse default", async () => {
    const existing = await seedWarehouse(orgId, {
      name: "Current Default",
      isDefault: true,
    });
    const other = await seedWarehouse(orgId, {
      name: "Other",
      isDefault: false,
    });

    const { updateWarehouse, getWarehouse } = await import(
      "@workspace/core/catalog"
    );
    await updateWarehouse(other.id, orgId, { isDefault: true });

    const refreshedExisting = await getWarehouse(existing.id, orgId);
    expect(refreshedExisting.isDefault).toBe(false);
  });
});

describe("deleteWarehouse", () => {
  it("deletes a warehouse and returns it", async () => {
    const seeded = await seedWarehouse(orgId, { name: "To Delete" });
    const { deleteWarehouse, getWarehouse } = await import(
      "@workspace/core/catalog"
    );
    const deleted = await deleteWarehouse(seeded.id, orgId);
    expect(deleted.name).toBe("To Delete");

    const found = await getWarehouse(seeded.id, orgId);
    expect(found).toBeUndefined();
  });

  it("cannot delete another org's warehouse", async () => {
    const otherUser = await seedUser();
    const otherOrg = await seedOrganization(otherUser.id);
    const seeded = await seedWarehouse(otherOrg.id, { name: "Protected WH" });

    const { deleteWarehouse, getWarehouse } = await import(
      "@workspace/core/catalog"
    );
    const result = await deleteWarehouse(seeded.id, orgId);
    expect(result).toBeUndefined();

    const stillExists = await getWarehouse(seeded.id, otherOrg.id);
    expect(stillExists).toBeDefined();
  });
});
