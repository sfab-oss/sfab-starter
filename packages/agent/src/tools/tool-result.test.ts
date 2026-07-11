import { DomainError } from "@workspace/core/errors";
import { describe, expect, it } from "vitest";
import { PERMISSION_DENIED_MESSAGE } from "../constants";
import { asToolResult, requireFound } from "./tool-result";

describe("requireFound", () => {
  it("returns data when present", () => {
    expect(requireFound({ id: "p1" })).toEqual({ id: "p1" });
  });

  it("throws DomainError not_found when null or undefined", () => {
    expect(() => requireFound(null)).toThrow(
      new DomainError("Not found", "not_found")
    );
    expect(() => requireFound(undefined)).toThrow(
      new DomainError("Not found", "not_found")
    );
    expect(() => requireFound(null, "Product not found: x")).toThrow(
      new DomainError("Product not found: x", "not_found")
    );
  });
});

describe("asToolResult", () => {
  it("returns ok:true with data on success", async () => {
    await expect(asToolResult(async () => ({ id: "p1" }))).resolves.toEqual({
      ok: true,
      data: { id: "p1" },
    });
  });

  it("maps DomainError codes", async () => {
    await expect(
      asToolResult(() => {
        throw new DomainError("Product not found: x", "not_found");
      })
    ).resolves.toEqual({
      ok: false,
      error: "Product not found: x",
      code: "not_found",
    });

    await expect(
      asToolResult(() => {
        throw new DomainError("ambiguous ref", "conflict");
      })
    ).resolves.toEqual({
      ok: false,
      error: "ambiguous ref",
      code: "conflict",
    });

    await expect(
      asToolResult(() => {
        throw new DomainError("bad payload", "unprocessable");
      })
    ).resolves.toEqual({
      ok: false,
      error: "bad payload",
      code: "unprocessable",
    });
  });

  it("maps requireFound miss through asToolResult", async () => {
    await expect(
      asToolResult(async () => requireFound(null, "Product not found: x"))
    ).resolves.toEqual({
      ok: false,
      error: "Product not found: x",
      code: "not_found",
    });
  });

  it("maps permission denied to forbidden", async () => {
    await expect(
      asToolResult(() => {
        throw new Error(PERMISSION_DENIED_MESSAGE);
      })
    ).resolves.toEqual({
      ok: false,
      error: PERMISSION_DENIED_MESSAGE,
      code: "forbidden",
    });
  });

  it("maps unknown errors to code unknown", async () => {
    await expect(
      asToolResult(() => {
        throw new Error("boom");
      })
    ).resolves.toEqual({
      ok: false,
      error: "boom",
      code: "unknown",
    });
  });
});
