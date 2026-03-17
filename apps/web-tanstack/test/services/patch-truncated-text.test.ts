import { describe, expect, it } from "vitest";
import { patchTruncatedTextParts } from "../../src/lib/ai/utils/stream/patch-truncated-text";

describe("patchTruncatedTextParts", () => {
  it("replaces truncated text with complete step text", () => {
    const parts = [
      { type: "step-start" },
      { type: "text", text: "Once upon a" },
      { type: "step-finish" },
    ];
    const result = patchTruncatedTextParts(parts, [
      "Once upon a time there was a dragon",
    ]);

    expect(result[1]).toEqual({
      type: "text",
      text: "Once upon a time there was a dragon",
    });
    // Non-text parts unchanged
    expect(result[0]).toEqual({ type: "step-start" });
    expect(result[2]).toEqual({ type: "step-finish" });
  });

  it("does not patch when completeStepTexts is empty (abort/error)", () => {
    const parts = [
      { type: "step-start" },
      { type: "text", text: "partial response" },
    ];
    const result = patchTruncatedTextParts(parts, []);

    expect(result[1]).toEqual({ type: "text", text: "partial response" });
  });

  it("does not patch when text lengths match (normal completion)", () => {
    const parts = [
      { type: "step-start" },
      { type: "text", text: "complete response" },
      { type: "step-finish" },
    ];
    const result = patchTruncatedTextParts(parts, ["complete response"]);

    expect(result[1]).toEqual({ type: "text", text: "complete response" });
  });

  it("handles multiple text parts with multiple steps", () => {
    const parts = [
      { type: "step-start" },
      { type: "text", text: "step 1 trunc" },
      { type: "step-finish" },
      { type: "step-start" },
      { type: "text", text: "step 2 trunc" },
      { type: "step-finish" },
    ];
    const result = patchTruncatedTextParts(parts, [
      "step 1 complete text here",
      "step 2 complete text here",
    ]);

    expect(result[1]).toEqual({
      type: "text",
      text: "step 1 complete text here",
    });
    expect(result[4]).toEqual({
      type: "text",
      text: "step 2 complete text here",
    });
  });

  it("does not patch when step text is shorter than part text", () => {
    const parts = [{ type: "text", text: "already longer than step" }];
    const result = patchTruncatedTextParts(parts, ["short"]);

    expect(result[0]).toEqual({
      type: "text",
      text: "already longer than step",
    });
  });

  it("preserves extra properties on text parts", () => {
    const parts = [{ type: "text", text: "truncated", someExtra: "data" }];
    const result = patchTruncatedTextParts(parts, ["complete text here"]);

    expect(result[0]).toEqual({
      type: "text",
      text: "complete text here",
      someExtra: "data",
    });
  });

  it("handles more text parts than step texts (only patches available)", () => {
    const parts = [
      { type: "text", text: "first truncated" },
      { type: "text", text: "second unchanged" },
    ];
    const result = patchTruncatedTextParts(parts, ["first complete text here"]);

    expect(result[0]).toEqual({
      type: "text",
      text: "first complete text here",
    });
    // Second text part unchanged — no corresponding step text
    expect(result[1]).toEqual({ type: "text", text: "second unchanged" });
  });

  it("skips non-text parts when counting step index", () => {
    const parts = [
      { type: "reasoning", text: "thinking..." },
      { type: "text", text: "truncated" },
    ];
    const result = patchTruncatedTextParts(parts, ["complete response"]);

    // reasoning part unchanged
    expect(result[0]).toEqual({ type: "reasoning", text: "thinking..." });
    // text part patched
    expect(result[1]).toEqual({ type: "text", text: "complete response" });
  });

  it("handles empty parts array", () => {
    const result = patchTruncatedTextParts([], ["some text"]);
    expect(result).toEqual([]);
  });

  it("handles empty text in part (undefined)", () => {
    const parts = [{ type: "text" }];
    const result = patchTruncatedTextParts(parts, ["complete text"]);

    expect(result[0]).toEqual({ type: "text", text: "complete text" });
  });
});
