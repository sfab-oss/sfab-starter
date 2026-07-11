import { describe, expect, it } from "vitest";
import {
  codemodeCompletedAsErrorIfFailed,
  codemodeDisplayStatus,
  codemodeFailureMessage,
} from "./codemode-output";

describe("codemodeFailureMessage", () => {
  it("returns the message when result is a plain object with a non-empty error string", () => {
    expect(
      codemodeFailureMessage({ error: "Product not found for id prod_missing" })
    ).toBe("Product not found for id prod_missing");
  });

  it("ignores successful row-shaped results without an error field", () => {
    expect(
      codemodeFailureMessage({
        id: "prod_abc",
        name: "Widget",
        deletedAt: "2026-07-10T00:00:00.000Z",
      })
    ).toBeUndefined();
  });

  it("ignores empty or whitespace-only error strings", () => {
    expect(codemodeFailureMessage({ error: "" })).toBeUndefined();
    expect(codemodeFailureMessage({ error: "   " })).toBeUndefined();
  });

  it("does not treat arbitrary values as failures", () => {
    expect(codemodeFailureMessage(null)).toBeUndefined();
    expect(codemodeFailureMessage("failed")).toBeUndefined();
    expect(codemodeFailureMessage(["error"])).toBeUndefined();
    expect(codemodeFailureMessage({ message: "nope" })).toBeUndefined();
  });
});

describe("codemodeDisplayStatus", () => {
  it("maps completed + result.error to error for the card badge", () => {
    expect(
      codemodeDisplayStatus("completed", {
        error: "Product not found for id prod_missing",
      })
    ).toBe("error");
  });

  it("keeps completed when the result is a successful delete row", () => {
    expect(
      codemodeDisplayStatus("completed", {
        id: "prod_abc",
        name: "Widget",
      })
    ).toBe("completed");
  });

  it("passes through paused, rejected, and error statuses unchanged", () => {
    expect(codemodeDisplayStatus("paused")).toBe("paused");
    expect(codemodeDisplayStatus("rejected")).toBe("rejected");
    expect(codemodeDisplayStatus("error")).toBe("error");
  });
});

describe("codemodeCompletedAsErrorIfFailed", () => {
  it("rewrites completed output when result carries an error message", () => {
    const output = {
      status: "completed" as const,
      executionId: "exec_1",
      result: { error: "Product not found" },
    };
    expect(codemodeCompletedAsErrorIfFailed(output)).toEqual({
      status: "error",
      executionId: "exec_1",
      result: { error: "Product not found" },
      error: "Product not found",
      appliedWrites: [],
    });
  });

  it("returns null for successful completed output", () => {
    expect(
      codemodeCompletedAsErrorIfFailed({
        status: "completed",
        result: { id: "prod_abc" },
      })
    ).toBeNull();
  });
});
