import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LOG_KINDS } from "../kinds.js";
import { errorMessage, structuredLog } from "../structured-log.js";

describe("structuredLog", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "debug").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emits a single-line JSON envelope with default severity info", () => {
    structuredLog({
      kind: "email_sent",
      organizationId: "org_1",
      to: "user@example.com",
    });

    expect(console.log).toHaveBeenCalledTimes(1);
    const line = vi.mocked(console.log).mock.calls[0]?.[0];
    expect(typeof line).toBe("string");
    expect(JSON.parse(line as string)).toEqual({
      kind: "email_sent",
      severity: "info",
      organizationId: "org_1",
      to: "user@example.com",
    });
    expect(console.warn).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it("routes warn/error/debug to the matching console method", () => {
    structuredLog({
      kind: "email_send_failed",
      severity: "warn",
      to: "user@example.com",
    });
    structuredLog({ kind: "unhandled_error", severity: "error" });
    structuredLog({
      kind: "catalog_search_failed",
      severity: "debug",
      detail: "x",
    });

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.debug).toHaveBeenCalledTimes(1);
    expect(
      JSON.parse(vi.mocked(console.warn).mock.calls[0]?.[0] as string)
    ).toMatchObject({
      kind: "email_send_failed",
      severity: "warn",
      to: "user@example.com",
    });
  });

  it("falls back when payload is not JSON-serializable", () => {
    const circular: { self?: unknown } = {};
    circular.self = circular;

    structuredLog({ kind: "email_sent", payload: circular });

    expect(console.log).toHaveBeenCalledTimes(1);
    expect(
      JSON.parse(vi.mocked(console.log).mock.calls[0]?.[0] as string)
    ).toEqual({
      kind: "email_sent",
      severity: "info",
      error: "structured_log_serialize_failed",
    });
  });

  it("exposes a non-empty registered kind vocabulary", () => {
    expect(LOG_KINDS.length).toBeGreaterThan(0);
    expect(new Set(LOG_KINDS).size).toBe(LOG_KINDS.length);
  });
});

describe("errorMessage", () => {
  it("extracts Error.message and stringifies other values", () => {
    expect(errorMessage(new Error("boom"))).toBe("boom");
    expect(errorMessage("plain")).toBe("plain");
    expect(errorMessage(42)).toBe("42");
  });
});
