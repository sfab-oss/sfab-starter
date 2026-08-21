import { describe, expect, it } from "vitest";
import { isNotFoundError, retryUnlessNotFound } from "./query";

describe("retryUnlessNotFound", () => {
  it("does not retry not-found errors", () => {
    expect(retryUnlessNotFound(0, new Error("Product not found"))).toBe(false);
    expect(retryUnlessNotFound(0, new Error("Entity not found"))).toBe(false);
  });

  it("retries other errors twice", () => {
    const err = new Error("Failed to load product");
    expect(retryUnlessNotFound(0, err)).toBe(true);
    expect(retryUnlessNotFound(1, err)).toBe(true);
    expect(retryUnlessNotFound(2, err)).toBe(false);
  });
});

describe("isNotFoundError", () => {
  it("matches not-found messages only", () => {
    expect(isNotFoundError(new Error("Document not found"))).toBe(true);
    expect(isNotFoundError(new Error("boom"))).toBe(false);
    expect(isNotFoundError("not found")).toBe(false);
  });
});
