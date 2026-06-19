import { SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { createTestSessionWithOrg } from "../helpers/auth";

let cookie: string;

const PRODUCTS_API = "http://localhost/api/protected/inventory/products";
const WAREHOUSES_API = "http://localhost/api/protected/inventory/warehouses";
const MOVEMENTS_API = "http://localhost/api/protected/inventory/movements";

async function createProduct(name: string, sku: string) {
  const res = await SELF.fetch(PRODUCTS_API, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ name, sku }),
  });
  return (await res.json()) as { id: string };
}

async function createWarehouse(name: string) {
  const res = await SELF.fetch(WAREHOUSES_API, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ name, isDefault: false }),
  });
  return (await res.json()) as { id: string };
}

beforeEach(async () => {
  const session = await createTestSessionWithOrg();
  cookie = session.cookie;
});

describe("POST /api/protected/inventory/movements", () => {
  it("performs an IN movement and updates stock", async () => {
    const product = await createProduct("Stock Item", "SI-001");
    const warehouse = await createWarehouse("Main WH");

    const res = await SELF.fetch(MOVEMENTS_API, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        type: "IN",
        quantity: 25,
        fromWarehouseId: null,
        toWarehouseId: warehouse.id,
        notes: null,
      }),
    });
    expect(res.status).toBe(200);

    // Verify stock updated
    const productRes = await SELF.fetch(`${PRODUCTS_API}/${product.id}`, {
      headers: { Cookie: cookie },
    });
    const data = (await productRes.json()) as { totalStock: number };
    expect(data.totalStock).toBe(25);
  });

  it("performs an OUT movement and decreases stock", async () => {
    const product = await createProduct("Out Item", "OI-001");
    const warehouse = await createWarehouse("Out WH");

    // Stock in first
    await SELF.fetch(MOVEMENTS_API, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        type: "IN",
        quantity: 50,
        fromWarehouseId: null,
        toWarehouseId: warehouse.id,
        notes: null,
      }),
    });

    // Stock out
    const res = await SELF.fetch(MOVEMENTS_API, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        type: "OUT",
        quantity: 15,
        fromWarehouseId: warehouse.id,
        toWarehouseId: null,
        notes: null,
      }),
    });
    expect(res.status).toBe(200);

    const productRes = await SELF.fetch(`${PRODUCTS_API}/${product.id}`, {
      headers: { Cookie: cookie },
    });
    const data = (await productRes.json()) as { totalStock: number };
    expect(data.totalStock).toBe(35);
  });

  it("performs a TRANSFER movement between warehouses", async () => {
    const product = await createProduct("Transfer Item", "TI-001");
    const whFrom = await createWarehouse("From WH");
    const whTo = await createWarehouse("To WH");

    // Initial stock
    await SELF.fetch(MOVEMENTS_API, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        type: "IN",
        quantity: 100,
        fromWarehouseId: null,
        toWarehouseId: whFrom.id,
        notes: null,
      }),
    });

    // Transfer
    const res = await SELF.fetch(MOVEMENTS_API, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        type: "TRANSFER",
        quantity: 30,
        fromWarehouseId: whFrom.id,
        toWarehouseId: whTo.id,
        notes: null,
      }),
    });
    expect(res.status).toBe(200);

    // Total stock should remain 100
    const productRes = await SELF.fetch(`${PRODUCTS_API}/${product.id}`, {
      headers: { Cookie: cookie },
    });
    const data = (await productRes.json()) as { totalStock: number };
    expect(data.totalStock).toBe(100);
  });

  it("records movement in product movement history", async () => {
    const product = await createProduct("History Item", "HI-001");
    const warehouse = await createWarehouse("History WH");

    await SELF.fetch(MOVEMENTS_API, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        type: "IN",
        quantity: 10,
        fromWarehouseId: null,
        toWarehouseId: warehouse.id,
        notes: "Initial restock",
      }),
    });

    const res = await SELF.fetch(`${PRODUCTS_API}/${product.id}/movements`, {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);
    const movements = (await res.json()) as {
      type: string;
      quantity: number;
      notes: string;
    }[];
    expect(movements).toHaveLength(1);
    expect(movements[0].type).toBe("IN");
    expect(movements[0].quantity).toBe(10);
    expect(movements[0].notes).toBe("Initial restock");
  });
});
