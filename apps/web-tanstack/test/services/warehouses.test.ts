import { beforeEach, describe, expect, it } from "vitest";
import { seedUser, seedWarehouse } from "../helpers/seed";

let userId: string;

beforeEach(async () => {
  const user = await seedUser();
  userId = user.id;
});

describe("getWarehouses", () => {
  it("returns empty list when no warehouses exist", async () => {
    const { getWarehouses } = await import("@workspace/core/warehouses");
    const warehouses = await getWarehouses(userId);
    expect(warehouses).toHaveLength(0);
  });

  it("returns warehouses ordered by name", async () => {
    await seedWarehouse(userId, { name: "Zeta Warehouse" });
    await seedWarehouse(userId, { name: "Alpha Warehouse" });

    const { getWarehouses } = await import("@workspace/core/warehouses");
    const warehouses = await getWarehouses(userId);
    expect(warehouses).toHaveLength(2);
    expect(warehouses[0].name).toBe("Alpha Warehouse");
    expect(warehouses[1].name).toBe("Zeta Warehouse");
  });

  it("does not return warehouses from other users", async () => {
    const otherUser = await seedUser();
    await seedWarehouse(userId, { name: "My Warehouse" });
    await seedWarehouse(otherUser.id, { name: "Other Warehouse" });

    const { getWarehouses } = await import("@workspace/core/warehouses");
    const warehouses = await getWarehouses(userId);
    expect(warehouses).toHaveLength(1);
    expect(warehouses[0].name).toBe("My Warehouse");
  });
});

describe("getWarehouse", () => {
  it("returns a warehouse by id", async () => {
    const seeded = await seedWarehouse(userId, { name: "Specific" });
    const { getWarehouse } = await import("@workspace/core/warehouses");
    const warehouse = await getWarehouse(seeded.id, userId);
    expect(warehouse).toBeDefined();
    expect(warehouse.name).toBe("Specific");
  });

  it("returns undefined for non-existent warehouse", async () => {
    const { getWarehouse } = await import("@workspace/core/warehouses");
    const warehouse = await getWarehouse("non-existent", userId);
    expect(warehouse).toBeUndefined();
  });
});

describe("getDefaultWarehouse", () => {
  it("returns the default warehouse", async () => {
    await seedWarehouse(userId, { name: "Regular", isDefault: false });
    await seedWarehouse(userId, { name: "Default", isDefault: true });

    const { getDefaultWarehouse } = await import("@workspace/core/warehouses");
    const warehouse = await getDefaultWarehouse(userId);
    expect(warehouse).toBeDefined();
    expect(warehouse.name).toBe("Default");
  });

  it("returns undefined when no default exists", async () => {
    await seedWarehouse(userId, { isDefault: false });
    const { getDefaultWarehouse } = await import("@workspace/core/warehouses");
    const warehouse = await getDefaultWarehouse(userId);
    expect(warehouse).toBeUndefined();
  });
});

describe("createWarehouse", () => {
  it("creates a warehouse", async () => {
    const { createWarehouse } = await import("@workspace/core/warehouses");
    const warehouse = await createWarehouse({
      userId,
      name: "New Warehouse",
      location: "Building A",
      isDefault: false,
    });
    expect(warehouse.name).toBe("New Warehouse");
    expect(warehouse.location).toBe("Building A");
  });

  it("unsets other defaults when creating a default warehouse", async () => {
    const { createWarehouse, getWarehouses } = await import(
      "@workspace/core/warehouses"
    );

    await createWarehouse({
      userId,
      name: "First Default",
      isDefault: true,
    });

    await createWarehouse({
      userId,
      name: "New Default",
      isDefault: true,
    });

    const warehouses = await getWarehouses(userId);
    const defaults = warehouses.filter((w) => w.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].name).toBe("New Default");
  });
});

describe("updateWarehouse", () => {
  it("updates warehouse fields", async () => {
    const seeded = await seedWarehouse(userId, { name: "Original" });
    const { updateWarehouse } = await import("@workspace/core/warehouses");
    const updated = await updateWarehouse(seeded.id, userId, {
      name: "Updated",
    });
    expect(updated.name).toBe("Updated");
  });

  it("unsets other defaults when making a warehouse default", async () => {
    const existing = await seedWarehouse(userId, {
      name: "Current Default",
      isDefault: true,
    });
    const other = await seedWarehouse(userId, {
      name: "Other",
      isDefault: false,
    });

    const { updateWarehouse, getWarehouse } = await import(
      "@workspace/core/warehouses"
    );
    await updateWarehouse(other.id, userId, { isDefault: true });

    const refreshedExisting = await getWarehouse(existing.id, userId);
    expect(refreshedExisting.isDefault).toBe(false);
  });
});

describe("deleteWarehouse", () => {
  it("deletes a warehouse and returns it", async () => {
    const seeded = await seedWarehouse(userId, { name: "To Delete" });
    const { deleteWarehouse, getWarehouse } = await import(
      "@workspace/core/warehouses"
    );
    const deleted = await deleteWarehouse(seeded.id, userId);
    expect(deleted.name).toBe("To Delete");

    const found = await getWarehouse(seeded.id, userId);
    expect(found).toBeUndefined();
  });
});
