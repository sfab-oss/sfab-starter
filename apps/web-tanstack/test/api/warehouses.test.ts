import { SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { createTestSessionWithOrg } from "../helpers/auth";

let cookie: string;

beforeEach(async () => {
  const session = await createTestSessionWithOrg();
  cookie = session.cookie;
});

const API = "http://localhost/api/protected/inventory/warehouses";

describe("GET /api/protected/inventory/warehouses", () => {
  it("returns empty list", async () => {
    const res = await SELF.fetch(API, {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual([]);
  });
});

describe("POST /api/protected/inventory/warehouses", () => {
  it("creates a warehouse", async () => {
    const res = await SELF.fetch(API, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Main Warehouse",
        location: "Building A",
        isDefault: true,
      }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { name: string; location: string };
    expect(data.name).toBe("Main Warehouse");
    expect(data.location).toBe("Building A");
  });
});

describe("GET /api/protected/inventory/warehouses/:id", () => {
  it("returns a specific warehouse", async () => {
    const createRes = await SELF.fetch(API, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Find Me", isDefault: false }),
    });
    const created = (await createRes.json()) as { id: string };

    const res = await SELF.fetch(`${API}/${created.id}`, {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { name: string };
    expect(data.name).toBe("Find Me");
  });

  it("returns 404 for non-existent warehouse", async () => {
    const res = await SELF.fetch(`${API}/non-existent`, {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/protected/inventory/warehouses/:id", () => {
  it("updates a warehouse", async () => {
    const createRes = await SELF.fetch(API, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Original", isDefault: false }),
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

describe("DELETE /api/protected/inventory/warehouses/:id", () => {
  it("deletes a warehouse", async () => {
    const createRes = await SELF.fetch(API, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Delete Me", isDefault: false }),
    });
    const created = (await createRes.json()) as { id: string };

    const deleteRes = await SELF.fetch(`${API}/${created.id}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
    expect(deleteRes.status).toBe(200);

    const getRes = await SELF.fetch(`${API}/${created.id}`, {
      headers: { Cookie: cookie },
    });
    expect(getRes.status).toBe(404);
  });
});
