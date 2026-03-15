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

// ---------- load-skill tool ----------

describe("load-skill tool", () => {
  it("returns definition for a valid skill", async () => {
    const { loadSkillTool } = await import("../../src/lib/ai/tools/load-skill");
    const result = await loadSkillTool.execute({ name: "product-manager" }, {
      toolCallId: "call-1",
      messages: [],
    } as never);

    expect(result).toHaveProperty("definition");
    expect(result.definition?.name).toBe("product-manager");
    expect(result.definition?.availableTools.length).toBeGreaterThan(0);
  });

  it("returns error for an unknown skill", async () => {
    const { loadSkillTool } = await import("../../src/lib/ai/tools/load-skill");
    const result = await loadSkillTool.execute({ name: "does-not-exist" }, {
      toolCallId: "call-1",
      messages: [],
    } as never);

    expect(result).toHaveProperty("error");
    expect(result.error).toContain("not found");
  });
});

// ---------- product tools ----------

describe("product tools", () => {
  it("list-products returns empty list initially", async () => {
    const { createProductTools } = await import(
      "../../src/lib/ai/tools/products"
    );
    const tools = createProductTools(orgId);
    const result = await tools["list-products"].execute({}, {
      toolCallId: "call-1",
      messages: [],
    } as never);

    expect(result).toEqual([]);
  });

  it("list-products returns seeded products", async () => {
    await seedProduct(orgId, { name: "Widget A", sku: "W-A" });
    await seedProduct(orgId, { name: "Widget B", sku: "W-B" });

    const { createProductTools } = await import(
      "../../src/lib/ai/tools/products"
    );
    const tools = createProductTools(orgId);
    const result = await tools["list-products"].execute({}, {
      toolCallId: "call-1",
      messages: [],
    } as never);

    expect(result).toHaveLength(2);
  });

  it("get-product returns a specific product", async () => {
    const product = await seedProduct(orgId, { name: "Gadget" });

    const { createProductTools } = await import(
      "../../src/lib/ai/tools/products"
    );
    const tools = createProductTools(orgId);
    const result = await tools["get-product"].execute({ id: product.id }, {
      toolCallId: "call-1",
      messages: [],
    } as never);

    expect(result.name).toBe("Gadget");
  });

  it("create-product creates and returns a product", async () => {
    const { createProductTools } = await import(
      "../../src/lib/ai/tools/products"
    );
    const tools = createProductTools(orgId);
    const result = await tools["create-product"].execute(
      { name: "New Item", sku: "NI-001", price: "9.99" },
      { toolCallId: "call-1", messages: [] } as never
    );

    expect(result.name).toBe("New Item");
    expect(result.sku).toBe("NI-001");
    expect(result.id).toBeTruthy();
  });

  it("update-product modifies a product", async () => {
    const product = await seedProduct(orgId, { name: "Old Name" });

    const { createProductTools } = await import(
      "../../src/lib/ai/tools/products"
    );
    const tools = createProductTools(orgId);
    const result = await tools["update-product"].execute(
      { id: product.id, data: { name: "New Name" } },
      { toolCallId: "call-1", messages: [] } as never
    );

    expect(result.name).toBe("New Name");
  });

  it("delete-product removes a product", async () => {
    const product = await seedProduct(orgId, { name: "To Delete" });

    const { createProductTools } = await import(
      "../../src/lib/ai/tools/products"
    );
    const tools = createProductTools(orgId);
    await tools["delete-product"].execute({ id: product.id }, {
      toolCallId: "call-1",
      messages: [],
    } as never);

    // Verify deletion
    const list = await tools["list-products"].execute({}, {
      toolCallId: "call-2",
      messages: [],
    } as never);
    expect(list).toHaveLength(0);
  });

  it("mutation tools have needsApproval set", async () => {
    const { createProductTools } = await import(
      "../../src/lib/ai/tools/products"
    );
    const tools = createProductTools(orgId);

    expect(tools["create-product"].needsApproval).toBe(true);
    expect(tools["update-product"].needsApproval).toBe(true);
    expect(tools["delete-product"].needsApproval).toBe(true);
    expect(tools["create-movement"].needsApproval).toBe(true);
  });

  it("read tools do not require approval", async () => {
    const { createProductTools } = await import(
      "../../src/lib/ai/tools/products"
    );
    const tools = createProductTools(orgId);

    expect(tools["list-products"].needsApproval).toBeFalsy();
    expect(tools["get-product"].needsApproval).toBeFalsy();
  });

  it("tools are scoped to the orgId", async () => {
    const otherUser = await seedUser();
    const otherOrg = await seedOrganization(otherUser.id);

    await seedProduct(orgId, { name: "My Product" });
    await seedProduct(otherOrg.id, { name: "Other Product" });

    const { createProductTools } = await import(
      "../../src/lib/ai/tools/products"
    );
    const tools = createProductTools(orgId);
    const result = await tools["list-products"].execute({}, {
      toolCallId: "call-1",
      messages: [],
    } as never);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("My Product");
  });

  it("get-product cannot access another org's product", async () => {
    const otherUser = await seedUser();
    const otherOrg = await seedOrganization(otherUser.id);
    const otherProduct = await seedProduct(otherOrg.id, {
      name: "Secret Product",
    });

    const { createProductTools } = await import(
      "../../src/lib/ai/tools/products"
    );
    const tools = createProductTools(orgId);
    const result = await tools["get-product"].execute({ id: otherProduct.id }, {
      toolCallId: "call-1",
      messages: [],
    } as never);

    expect(result).toBeUndefined();
  });
});

// ---------- warehouse tools ----------

describe("warehouse tools", () => {
  it("list-warehouses returns empty list initially", async () => {
    const { createWarehouseTools } = await import(
      "../../src/lib/ai/tools/warehouses"
    );
    const tools = createWarehouseTools(orgId);
    const result = await tools["list-warehouses"].execute({}, {
      toolCallId: "call-1",
      messages: [],
    } as never);

    expect(result).toEqual([]);
  });

  it("list-warehouses returns seeded warehouses", async () => {
    await seedWarehouse(orgId, { name: "Warehouse A" });
    await seedWarehouse(orgId, { name: "Warehouse B" });

    const { createWarehouseTools } = await import(
      "../../src/lib/ai/tools/warehouses"
    );
    const tools = createWarehouseTools(orgId);
    const result = await tools["list-warehouses"].execute({}, {
      toolCallId: "call-1",
      messages: [],
    } as never);

    expect(result).toHaveLength(2);
  });

  it("get-warehouse returns a specific warehouse", async () => {
    const warehouse = await seedWarehouse(orgId, { name: "Main Depot" });

    const { createWarehouseTools } = await import(
      "../../src/lib/ai/tools/warehouses"
    );
    const tools = createWarehouseTools(orgId);
    const result = await tools["get-warehouse"].execute({ id: warehouse.id }, {
      toolCallId: "call-1",
      messages: [],
    } as never);

    expect(result.name).toBe("Main Depot");
  });

  it("create-warehouse creates and returns a warehouse", async () => {
    const { createWarehouseTools } = await import(
      "../../src/lib/ai/tools/warehouses"
    );
    const tools = createWarehouseTools(orgId);
    const result = await tools["create-warehouse"].execute(
      { name: "New Warehouse", location: "Building C" },
      { toolCallId: "call-1", messages: [] } as never
    );

    expect(result.name).toBe("New Warehouse");
    expect(result.location).toBe("Building C");
    expect(result.id).toBeTruthy();
  });

  it("update-warehouse modifies a warehouse", async () => {
    const warehouse = await seedWarehouse(orgId, { name: "Old Name" });

    const { createWarehouseTools } = await import(
      "../../src/lib/ai/tools/warehouses"
    );
    const tools = createWarehouseTools(orgId);
    const result = await tools["update-warehouse"].execute(
      { id: warehouse.id, data: { name: "New Name" } },
      { toolCallId: "call-1", messages: [] } as never
    );

    expect(result.name).toBe("New Name");
  });

  it("delete-warehouse removes a warehouse", async () => {
    const warehouse = await seedWarehouse(orgId, { name: "To Delete" });

    const { createWarehouseTools } = await import(
      "../../src/lib/ai/tools/warehouses"
    );
    const tools = createWarehouseTools(orgId);
    await tools["delete-warehouse"].execute({ id: warehouse.id }, {
      toolCallId: "call-1",
      messages: [],
    } as never);

    const list = await tools["list-warehouses"].execute({}, {
      toolCallId: "call-2",
      messages: [],
    } as never);
    expect(list).toHaveLength(0);
  });

  it("mutation tools have needsApproval set", async () => {
    const { createWarehouseTools } = await import(
      "../../src/lib/ai/tools/warehouses"
    );
    const tools = createWarehouseTools(orgId);

    expect(tools["create-warehouse"].needsApproval).toBe(true);
    expect(tools["update-warehouse"].needsApproval).toBe(true);
    expect(tools["delete-warehouse"].needsApproval).toBe(true);
  });

  it("tools are scoped to the orgId", async () => {
    const otherUser = await seedUser();
    const otherOrg = await seedOrganization(otherUser.id);

    await seedWarehouse(orgId, { name: "My Warehouse" });
    await seedWarehouse(otherOrg.id, { name: "Other Warehouse" });

    const { createWarehouseTools } = await import(
      "../../src/lib/ai/tools/warehouses"
    );
    const tools = createWarehouseTools(orgId);
    const result = await tools["list-warehouses"].execute({}, {
      toolCallId: "call-1",
      messages: [],
    } as never);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("My Warehouse");
  });

  it("get-warehouse cannot access another org's warehouse", async () => {
    const otherUser = await seedUser();
    const otherOrg = await seedOrganization(otherUser.id);
    const otherWarehouse = await seedWarehouse(otherOrg.id, {
      name: "Secret Warehouse",
    });

    const { createWarehouseTools } = await import(
      "../../src/lib/ai/tools/warehouses"
    );
    const tools = createWarehouseTools(orgId);
    const result = await tools["get-warehouse"].execute(
      { id: otherWarehouse.id },
      { toolCallId: "call-1", messages: [] } as never
    );

    expect(result).toBeUndefined();
  });
});
