import { SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { createTestSessionWithOrg } from "../helpers/auth";

let cookie: string;

const PRODUCTS_API = "http://localhost/api/protected/inventory/products";
const WAREHOUSES_API = "http://localhost/api/protected/inventory/warehouses";
const SEARCH_API = "http://localhost/api/protected/inventory/search";

beforeEach(async () => {
  const session = await createTestSessionWithOrg();
  cookie = session.cookie;
});

describe("GET /api/protected/inventory/search", () => {
  it("returns empty results for empty query", async () => {
    const res = await SELF.fetch(SEARCH_API, {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { results: unknown[] };
    expect(data.results).toEqual([]);
  });

  it("finds products by name", async () => {
    await SELF.fetch(PRODUCTS_API, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Searchable Widget", sku: "SW-001" }),
    });

    const res = await SELF.fetch(`${SEARCH_API}?q=Searchable`, {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      results: { metadata: { type: string; title: string } }[];
    };
    expect(data.results).toHaveLength(1);
    expect(data.results[0].metadata.type).toBe("product");
    expect(data.results[0].metadata.title).toBe("Searchable Widget");
  });

  it("finds products by SKU", async () => {
    await SELF.fetch(PRODUCTS_API, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Any Product", sku: "UNIQUE-SKU-123" }),
    });

    const res = await SELF.fetch(`${SEARCH_API}?q=UNIQUE-SKU`, {
      headers: { Cookie: cookie },
    });
    const data = (await res.json()) as {
      results: { metadata: { sku: string } }[];
    };
    expect(data.results).toHaveLength(1);
    expect(data.results[0].metadata.sku).toBe("UNIQUE-SKU-123");
  });

  it("finds warehouses by name", async () => {
    await SELF.fetch(WAREHOUSES_API, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Downtown Depot", isDefault: false }),
    });

    const res = await SELF.fetch(`${SEARCH_API}?q=Downtown`, {
      headers: { Cookie: cookie },
    });
    const data = (await res.json()) as {
      results: { metadata: { type: string; title: string } }[];
    };
    expect(data.results).toHaveLength(1);
    expect(data.results[0].metadata.type).toBe("warehouse");
    expect(data.results[0].metadata.title).toBe("Downtown Depot");
  });

  it("returns both products and warehouses in results", async () => {
    await SELF.fetch(PRODUCTS_API, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Alpha Item", sku: "AI-001" }),
    });
    await SELF.fetch(WAREHOUSES_API, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Alpha Storage", isDefault: false }),
    });

    const res = await SELF.fetch(`${SEARCH_API}?q=Alpha`, {
      headers: { Cookie: cookie },
    });
    const data = (await res.json()) as {
      results: { metadata: { type: string } }[];
    };
    expect(data.results).toHaveLength(2);
    const types = data.results.map((r) => r.metadata.type);
    expect(types).toContain("product");
    expect(types).toContain("warehouse");
  });

  it("returns no results for unmatched query", async () => {
    await SELF.fetch(PRODUCTS_API, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Real Product", sku: "RP-001" }),
    });

    const res = await SELF.fetch(`${SEARCH_API}?q=nonexistent`, {
      headers: { Cookie: cookie },
    });
    const data = (await res.json()) as { results: unknown[] };
    expect(data.results).toHaveLength(0);
  });
});
