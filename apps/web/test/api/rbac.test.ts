import { env, SELF } from "cloudflare:test";
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import {
  extractAuth,
  requireActiveOrg,
  requireAuth,
  requirePermission,
} from "../../src/hono/middleware/auth";
import type {
  HonoContext,
  HonoContextWithAuthAndOrg,
} from "../../src/hono/types";
import { createTestSessionWithOrg } from "../helpers/auth";

// Mirror the real middleware composition (protected → org-protected → gate) so
// the test drives the *actual* guard chain end-to-end with real session cookies.
const orgGated = new Hono<HonoContextWithAuthAndOrg>()
  .use("*", requireActiveOrg)
  .get("/gated", requirePermission("member:manage"), (c) =>
    c.json({ ok: true })
  );

const gatedApp = new Hono<HonoContext>()
  .use("*", extractAuth)
  .use("*", requireAuth)
  .route("/", orgGated);

const GATED_URL = "http://localhost/gated";

async function demoteToOperator(userId: string) {
  // apps/web has no direct drizzle-orm dep; demote via the raw D1 binding.
  await env.DB.prepare("UPDATE member SET role = ? WHERE user_id = ?")
    .bind("member", userId)
    .run();
}

describe("requirePermission server-side RBAC guard", () => {
  it("lets an admin+ (owner) caller through a gated route", async () => {
    const owner = await createTestSessionWithOrg({ orgName: "Owner Org" });
    const res = await gatedApp.request(GATED_URL, {
      headers: { Cookie: owner.cookie },
    });
    expect(res.status).toBe(200);
  });

  it("returns 403 for an operator on a gated (admin+) route", async () => {
    const operator = await createTestSessionWithOrg({
      orgName: "Operator Org",
    });
    await demoteToOperator(operator.userId);

    const res = await gatedApp.request(GATED_URL, {
      headers: { Cookie: operator.cookie },
    });
    expect(res.status).toBe(403);
  });

  it("returns 401 without a session", async () => {
    const res = await gatedApp.request(GATED_URL);
    expect(res.status).toBe(401);
  });
});

describe("catalog:write gate on the real REST routes", () => {
  // Proves requirePermission is actually mounted on the production catalog
  // router (not just a synthetic app) and that catalog writes are operator+.
  it("allows an operator to create a product (catalog:write is operator+)", async () => {
    const operator = await createTestSessionWithOrg({ orgName: "Catalog Org" });
    await demoteToOperator(operator.userId);

    const res = await SELF.fetch(
      "http://localhost/api/protected/catalog/products",
      {
        method: "POST",
        headers: {
          Cookie: operator.cookie,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "Operator Product", sku: "OP-RBAC-001" }),
      }
    );

    expect(res.status).toBe(200);
  });
});
