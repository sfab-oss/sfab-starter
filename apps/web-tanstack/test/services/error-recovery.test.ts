import { APICallError } from "ai";
import { describe, expect, it } from "vitest";
import {
  formatErrorForUser,
  isContextOverflowError,
  isRateLimitError,
} from "../../src/lib/ai/context/error-recovery";

// ---------- isContextOverflowError ----------

describe("isContextOverflowError", () => {
  it("detects context overflow via APICallError responseBody", () => {
    const error = new APICallError({
      message: "API error",
      statusCode: 400,
      url: "https://api.example.com",
      requestBodyValues: {},
      responseBody: '{"error":{"type":"context_length_exceeded"}}',
    });
    expect(isContextOverflowError(error)).toBe(true);
  });

  it("detects token limit in APICallError responseBody", () => {
    const error = new APICallError({
      message: "API error",
      statusCode: 400,
      url: "https://api.example.com",
      requestBodyValues: {},
      responseBody: "Request exceeds the maximum context length",
    });
    expect(isContextOverflowError(error)).toBe(true);
  });

  it("returns false for non-context APICallError", () => {
    const error = new APICallError({
      message: "API error",
      statusCode: 500,
      url: "https://api.example.com",
      requestBodyValues: {},
      responseBody: "internal server error",
    });
    expect(isContextOverflowError(error)).toBe(false);
  });

  it("falls back to message matching for non-APICallError", () => {
    expect(isContextOverflowError(new Error("context_length_exceeded"))).toBe(
      true
    );
  });

  it("detects too many tokens in message fallback", () => {
    expect(
      isContextOverflowError(new Error("too many tokens in the request"))
    ).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    expect(isContextOverflowError(new Error("network timeout"))).toBe(false);
  });

  it("handles string errors", () => {
    expect(isContextOverflowError("context_length_exceeded")).toBe(true);
  });

  it("handles non-Error objects", () => {
    expect(isContextOverflowError({ message: "something" })).toBe(false);
  });
});

// ---------- isRateLimitError ----------

describe("isRateLimitError", () => {
  it("detects rate limit via APICallError statusCode 429", () => {
    const error = new APICallError({
      message: "rate limited",
      statusCode: 429,
      url: "https://api.example.com",
      requestBodyValues: {},
    });
    expect(isRateLimitError(error)).toBe(true);
  });

  it("returns false for APICallError with non-429 status", () => {
    const error = new APICallError({
      message: "server error",
      statusCode: 500,
      url: "https://api.example.com",
      requestBodyValues: {},
    });
    expect(isRateLimitError(error)).toBe(false);
  });

  it("falls back to message matching for rate_limit", () => {
    expect(isRateLimitError(new Error("rate_limit exceeded"))).toBe(true);
  });

  it("detects too_many_requests in message", () => {
    expect(isRateLimitError(new Error("too_many_requests"))).toBe(true);
  });

  it("detects 'rate limit' with space", () => {
    expect(isRateLimitError(new Error("You hit a rate limit"))).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    expect(isRateLimitError(new Error("connection refused"))).toBe(false);
  });
});

// ---------- formatErrorForUser ----------

describe("formatErrorForUser", () => {
  it("returns context overflow message for token limit errors", () => {
    const error = new APICallError({
      message: "API error",
      statusCode: 400,
      url: "https://api.example.com",
      requestBodyValues: {},
      responseBody: "context_length_exceeded",
    });
    const msg = formatErrorForUser(error);
    expect(msg).toContain("too long");
    expect(msg).toContain("new chat");
  });

  it("returns rate limit message for 429 errors", () => {
    const error = new APICallError({
      message: "rate limited",
      statusCode: 429,
      url: "https://api.example.com",
      requestBodyValues: {},
    });
    const msg = formatErrorForUser(error);
    expect(msg).toContain("temporarily busy");
  });

  it("returns generic message for unknown errors", () => {
    const msg = formatErrorForUser(new Error("something weird"));
    expect(msg).toContain("unexpected error");
  });

  it("handles null/undefined gracefully", () => {
    const msg = formatErrorForUser(null);
    expect(msg).toContain("unexpected error");
  });
});
