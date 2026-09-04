import { describe, expect, it } from "vitest";
import {
  authOrigin,
  defaultMcpResource,
  mcpIssuer,
  mcpResource,
} from "./mcp-resource";

const ORIGIN = "https://app.example.com";
const RESOURCE = "https://app.example.com/mcp";

describe("mcpResource", () => {
  it("appends /mcp to a normalized origin", () => {
    expect(mcpResource(ORIGIN)).toBe(RESOURCE);
  });

  it("strips trailing slashes before appending /mcp", () => {
    expect(mcpResource("https://app.example.com/")).toBe(RESOURCE);
    expect(mcpResource("https://app.example.com///")).toBe(RESOURCE);
  });
});

describe("mcpIssuer", () => {
  it("is origin plus /api/auth", () => {
    expect(mcpIssuer(ORIGIN)).toBe("https://app.example.com/api/auth");
    expect(mcpIssuer("https://app.example.com/")).toBe(
      "https://app.example.com/api/auth"
    );
  });
});

describe("authOrigin", () => {
  it("strips trailing slashes", () => {
    expect(authOrigin("http://localhost:4011/")).toBe("http://localhost:4011");
  });
});

describe("defaultMcpResource", () => {
  it("injects the resource on a token request that omits it", () => {
    const body = { grant_type: "authorization_code", code: "abc" };
    expect(defaultMcpResource("/oauth2/token", body, RESOURCE)).toEqual({
      grant_type: "authorization_code",
      code: "abc",
      resource: RESOURCE,
    });
  });

  it("injects the resource on a refresh_token grant too", () => {
    const body = { grant_type: "refresh_token", refresh_token: "r" };
    expect(defaultMcpResource("/oauth2/token", body, RESOURCE)).toEqual({
      grant_type: "refresh_token",
      refresh_token: "r",
      resource: RESOURCE,
    });
  });

  it("treats an empty-string resource as missing", () => {
    const body = { grant_type: "authorization_code", resource: "" };
    expect(defaultMcpResource("/oauth2/token", body, RESOURCE)).toEqual({
      grant_type: "authorization_code",
      resource: RESOURCE,
    });
  });

  it("leaves a client-supplied resource untouched", () => {
    const body = {
      grant_type: "authorization_code",
      resource: RESOURCE,
    };
    expect(defaultMcpResource("/oauth2/token", body, RESOURCE)).toBeUndefined();
  });

  it("does not touch non-token endpoints", () => {
    expect(
      defaultMcpResource("/oauth2/authorize", { grant_type: "x" }, RESOURCE)
    ).toBeUndefined();
    expect(defaultMcpResource(undefined, {}, RESOURCE)).toBeUndefined();
  });

  it("ignores a non-object body", () => {
    expect(
      defaultMcpResource("/oauth2/token", undefined, RESOURCE)
    ).toBeUndefined();
    expect(
      defaultMcpResource("/oauth2/token", "raw", RESOURCE)
    ).toBeUndefined();
    expect(defaultMcpResource("/oauth2/token", null, RESOURCE)).toBeUndefined();
  });

  it("does not mutate the input body", () => {
    const body = { grant_type: "authorization_code" };
    defaultMcpResource("/oauth2/token", body, RESOURCE);
    expect(body).toEqual({ grant_type: "authorization_code" });
  });
});
