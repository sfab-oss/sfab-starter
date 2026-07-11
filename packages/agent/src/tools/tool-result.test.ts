import { DomainError } from "@workspace/core/errors";
import { describe, expect, it } from "vitest";
import { PERMISSION_DENIED_MESSAGE } from "../constants";
import { asToolResult, asToolResultFound, toolNotFound } from "./tool-result";

describe("toolNotFound", () => {
  it("returns a not_found ToolErr", () => {
    expect(toolNotFound("missing")).toEqual({
      ok: false,
      error: "missing",
      code: "not_found",
    });
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

describe("asToolResultFound", () => {
  it("returns not_found when execute yields null or undefined", async () => {
    await expect(
      asToolResultFound(async () => null, "Product not found: x")
    ).resolves.toEqual({
      ok: false,
      error: "Product not found: x",
      code: "not_found",
    });

    await expect(
      asToolResultFound(async () => undefined, "Product not found: x")
    ).resolves.toEqual({
      ok: false,
      error: "Product not found: x",
      code: "not_found",
    });
  });

  it("returns ok:true when data is present", async () => {
    await expect(
      asToolResultFound(async () => ({ id: "p1" }), "missing")
    ).resolves.toEqual({
      ok: true,
      data: { id: "p1" },
    });
  });
});
