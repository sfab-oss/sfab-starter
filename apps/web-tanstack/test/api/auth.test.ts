import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { createTestSession } from "../helpers/auth";

describe("auth enforcement", () => {
  it("returns 401 on protected routes without session", async () => {
    const res = await SELF.fetch("http://localhost/api/protected/me");
    expect(res.status).toBe(401);
  });

  it("returns 403 on org-protected routes without active org", async () => {
    // Create session without org
    const { cookie } = await createTestSession();
    const res = await SELF.fetch(
      "http://localhost/api/protected/inventory/products",
      { headers: { Cookie: cookie } }
    );
    expect(res.status).toBe(403);
  });

  it("returns user info on /protected/me with valid session", async () => {
    const { cookie, email } = await createTestSession();
    const res = await SELF.fetch("http://localhost/api/protected/me", {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { user: { email: string } };
    expect(data.user.email).toBe(email);
  });
});
