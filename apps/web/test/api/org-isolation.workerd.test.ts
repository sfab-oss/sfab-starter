import { SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { createTestSessionWithOrg } from "../helpers/auth";

const PRODUCTS_API = "http://localhost/api/protected/catalog/products";
const SEARCH_API = "http://localhost/api/protected/catalog/search";

let orgA: { cookie: string };
let orgB: { cookie: string };

beforeEach(async () => {
  orgA = await createTestSessionWithOrg({ orgName: "Org A" });
  orgB = await createTestSessionWithOrg({ orgName: "Org B" });
});

function post(url: string, cookie: string, body: object) {
  return SELF.fetch(url, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function get(url: string, cookie: string) {
  return SELF.fetch(url, { headers: { Cookie: cookie } });
}

function put(url: string, cookie: string, body: object) {
  return SELF.fetch(url, {
    method: "PUT",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function del(url: string, cookie: string) {
  return SELF.fetch(url, {
    method: "DELETE",
    headers: { Cookie: cookie },
  });
}

describe("Product org isolation", () => {
  it("Org B cannot list Org A's products", async () => {
    await post(PRODUCTS_API, orgA.cookie, {
      name: "Org A Product",
      sku: "OA-001",
    });

    const res = await get(PRODUCTS_API, orgB.cookie);
    const data = (await res.json()) as { data: { name: string }[] };
    expect(data.data).toHaveLength(0);
  });

  it("Org B cannot read Org A's product by ID", async () => {
    const createRes = await post(PRODUCTS_API, orgA.cookie, {
      name: "Secret Product",
      sku: "SP-001",
    });
    const created = (await createRes.json()) as { id: string };

    const res = await get(`${PRODUCTS_API}/${created.id}`, orgB.cookie);
    expect(res.status).toBe(404);
  });

  it("Org B cannot update Org A's product", async () => {
    const createRes = await post(PRODUCTS_API, orgA.cookie, {
      name: "Original",
      sku: "UP-001",
    });
    const created = (await createRes.json()) as { id: string };

    await put(`${PRODUCTS_API}/${created.id}`, orgB.cookie, {
      name: "Hacked",
    });

    const res = await get(`${PRODUCTS_API}/${created.id}`, orgA.cookie);
    const data = (await res.json()) as { name: string };
    expect(data.name).toBe("Original");
  });

  it("Org B cannot delete Org A's product", async () => {
    const createRes = await post(PRODUCTS_API, orgA.cookie, {
      name: "Protected",
      sku: "DEL-001",
    });
    const created = (await createRes.json()) as { id: string };

    await del(`${PRODUCTS_API}/${created.id}`, orgB.cookie);

    const res = await get(`${PRODUCTS_API}/${created.id}`, orgA.cookie);
    expect(res.status).toBe(200);
  });
});

describe("Search org isolation", () => {
  it("Org B cannot find Org A's products via search", async () => {
    await post(PRODUCTS_API, orgA.cookie, {
      name: "Searchable Widget",
      sku: "SW-001",
    });

    const res = await get(`${SEARCH_API}?q=Searchable`, orgB.cookie);
    const data = (await res.json()) as { results: unknown[] };
    expect(data.results).toHaveLength(0);
  });
});
