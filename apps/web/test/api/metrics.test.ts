import { SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { createTestSessionWithOrg } from "../helpers/auth";

let cookie: string;

const PRODUCTS_API = "http://localhost/api/protected/inventory/products";
const WAREHOUSES_API = "http://localhost/api/protected/inventory/warehouses";
const MOVEMENTS_API = "http://localhost/api/protected/inventory/movements";
const METRICS_API = "http://localhost/api/protected/inventory/metrics";

function postMovement(body: object) {
  return SELF.fetch(MOVEMENTS_API, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(async () => {
  const session = await createTestSessionWithOrg();
  cookie = session.cookie;
});

describe("GET /api/protected/inventory/metrics", () => {
  it("returns empty metrics for new org", async () => {
    const res = await SELF.fetch(METRICS_API, {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      activeProducts: unknown[];
      recentMovements: unknown[];
    };
    expect(data.activeProducts).toHaveLength(0);
    expect(data.recentMovements).toHaveLength(0);
  });

  it("returns active products", async () => {
    await SELF.fetch(PRODUCTS_API, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Metric Product", sku: "MP-001" }),
    });

    const res = await SELF.fetch(METRICS_API, {
      headers: { Cookie: cookie },
    });
    const data = (await res.json()) as {
      activeProducts: { name: string }[];
      recentMovements: unknown[];
    };
    expect(data.activeProducts).toHaveLength(1);
    expect(data.activeProducts[0].name).toBe("Metric Product");
  });

  it("returns recent IN and OUT movements", async () => {
    const productRes = await SELF.fetch(PRODUCTS_API, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Movement Product", sku: "MV-001" }),
    });
    const product = (await productRes.json()) as { id: string };

    const whRes = await SELF.fetch(WAREHOUSES_API, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Movement WH", isDefault: false }),
    });
    const warehouse = (await whRes.json()) as { id: string };

    // IN movement
    await postMovement({
      productId: product.id,
      type: "IN",
      quantity: 50,
      fromWarehouseId: null,
      toWarehouseId: warehouse.id,
      notes: null,
    });

    // OUT movement
    await postMovement({
      productId: product.id,
      type: "OUT",
      quantity: 10,
      fromWarehouseId: warehouse.id,
      toWarehouseId: null,
      notes: null,
    });

    const res = await SELF.fetch(METRICS_API, {
      headers: { Cookie: cookie },
    });
    const data = (await res.json()) as {
      activeProducts: unknown[];
      recentMovements: { type: string; quantity: number }[];
    };

    expect(data.recentMovements).toHaveLength(2);
    const types = data.recentMovements.map((m) => m.type);
    expect(types).toContain("IN");
    expect(types).toContain("OUT");
  });

  it("does not include TRANSFER or ADJUSTMENT in recent movements", async () => {
    const productRes = await SELF.fetch(PRODUCTS_API, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Transfer Product", sku: "TP-001" }),
    });
    const product = (await productRes.json()) as { id: string };

    const wh1Res = await SELF.fetch(WAREHOUSES_API, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "WH 1", isDefault: false }),
    });
    const wh1 = (await wh1Res.json()) as { id: string };

    const wh2Res = await SELF.fetch(WAREHOUSES_API, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "WH 2", isDefault: false }),
    });
    const wh2 = (await wh2Res.json()) as { id: string };

    // IN first
    await postMovement({
      productId: product.id,
      type: "IN",
      quantity: 100,
      fromWarehouseId: null,
      toWarehouseId: wh1.id,
      notes: null,
    });

    // TRANSFER (should not appear in metrics)
    await postMovement({
      productId: product.id,
      type: "TRANSFER",
      quantity: 20,
      fromWarehouseId: wh1.id,
      toWarehouseId: wh2.id,
      notes: null,
    });

    const res = await SELF.fetch(METRICS_API, {
      headers: { Cookie: cookie },
    });
    const data = (await res.json()) as {
      recentMovements: { type: string }[];
    };

    // Only IN should be in recent movements (metrics filters to IN/OUT only)
    expect(data.recentMovements).toHaveLength(1);
    expect(data.recentMovements[0].type).toBe("IN");
  });
});
