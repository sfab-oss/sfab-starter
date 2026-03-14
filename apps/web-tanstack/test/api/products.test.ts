import { SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { createTestSessionWithOrg } from "../helpers/auth";

let cookie: string;

beforeEach(async () => {
  const session = await createTestSessionWithOrg();
  cookie = session.cookie;
});

const API = "http://localhost/api/protected/inventory/products";

describe("GET /api/protected/inventory/products", () => {
  it("returns empty product list", async () => {
    const res = await SELF.fetch(API, {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual([]);
  });

  it("returns created products", async () => {
    // Create a product first
    await SELF.fetch(API, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test Product", sku: "TP-001" }),
    });

    const res = await SELF.fetch(API, {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { name: string }[];
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("Test Product");
  });
});

describe("POST /api/protected/inventory/products", () => {
  it("creates a product", async () => {
    const res = await SELF.fetch(API, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "New Product",
        sku: "NP-001",
        price: 29.99,
      }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      name: string;
      sku: string;
      price: string;
    };
    expect(data.name).toBe("New Product");
    expect(data.sku).toBe("NP-001");
  });

  it("rejects invalid payload", async () => {
    const res = await SELF.fetch(API, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "X" }), // Missing sku, name too short
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/protected/inventory/products/:id", () => {
  it("returns a specific product", async () => {
    const createRes = await SELF.fetch(API, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Find Me", sku: "FM-001" }),
    });
    const created = (await createRes.json()) as { id: string };

    const res = await SELF.fetch(`${API}/${created.id}`, {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { name: string };
    expect(data.name).toBe("Find Me");
  });

  it("returns 404 for non-existent product", async () => {
    const res = await SELF.fetch(`${API}/non-existent`, {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/protected/inventory/products/:id", () => {
  it("updates a product", async () => {
    const createRes = await SELF.fetch(API, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Original", sku: "OR-001" }),
    });
    const created = (await createRes.json()) as { id: string };

    const res = await SELF.fetch(`${API}/${created.id}`, {
      method: "PUT",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Updated" }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { name: string };
    expect(data.name).toBe("Updated");
  });
});

describe("DELETE /api/protected/inventory/products/:id", () => {
  it("deletes a product", async () => {
    const createRes = await SELF.fetch(API, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Delete Me", sku: "DM-001" }),
    });
    const created = (await createRes.json()) as { id: string };

    const deleteRes = await SELF.fetch(`${API}/${created.id}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
    expect(deleteRes.status).toBe(200);

    // Verify it's gone
    const getRes = await SELF.fetch(`${API}/${created.id}`, {
      headers: { Cookie: cookie },
    });
    expect(getRes.status).toBe(404);
  });
});
