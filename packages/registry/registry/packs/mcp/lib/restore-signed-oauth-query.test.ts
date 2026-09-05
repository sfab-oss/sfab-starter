import { describe, expect, it } from "vitest";
import { restoreSignedOAuthQuery } from "./restore-signed-oauth-query";

describe("restoreSignedOAuthQuery", () => {
  it("leaves a plain query string unchanged", () => {
    expect(restoreSignedOAuthQuery("client_id=abc&sig=xyz")).toBe(
      "client_id=abc&sig=xyz"
    );
  });

  it("expands a JSON ba_param array into repeated keys", () => {
    const raw = `client_id=abc&ba_param=${encodeURIComponent(
      '["client_id","scope"]'
    )}&sig=xyz`;
    const restored = new URLSearchParams(restoreSignedOAuthQuery(raw));
    expect(restored.getAll("ba_param")).toEqual(["client_id", "scope"]);
    expect(restored.get("sig")).toBe("xyz");
  });
});
