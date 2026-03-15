import { describe, expect, it } from "vitest";
import {
  truncateToolOutput,
  wrapToolsWithTruncation,
} from "../../src/lib/ai/tools/truncation";

// ---------- truncateToolOutput ----------

describe("truncateToolOutput", () => {
  it("passes through small string outputs unchanged", () => {
    expect(truncateToolOutput("hello")).toBe("hello");
  });

  it("passes through small object outputs unchanged", () => {
    const obj = { id: 1, name: "test" };
    expect(truncateToolOutput(obj)).toBe(obj);
  });

  it("truncates strings exceeding 50KB", () => {
    const big = "x".repeat(60 * 1024);
    const result = truncateToolOutput(big) as string;
    expect(result.length).toBeLessThan(big.length);
    expect(result).toContain("[Output was truncated");
  });

  it("truncates objects whose serialization exceeds 50KB", () => {
    const big = { data: "x".repeat(60 * 1024) };
    const result = truncateToolOutput(big) as string;
    expect(typeof result).toBe("string");
    expect(result).toContain("[Output was truncated");
  });

  it("truncates outputs exceeding 2000 lines", () => {
    const lines = Array.from({ length: 3000 }, (_, i) => `line ${i}`);
    const big = lines.join("\n");
    const result = truncateToolOutput(big) as string;
    expect(result).toContain("[Output was truncated");
    // Count lines before the truncation notice
    const resultLines = result.split("\n");
    // 2000 lines + 2 blank lines from notice + notice text
    expect(resultLines.length).toBeLessThan(3000);
  });

  it("does not truncate output with exactly 2000 lines under char limit", () => {
    const lines = Array.from({ length: 2000 }, (_, i) => `l${i}`);
    const output = lines.join("\n");
    // Make sure it's under 50KB
    expect(output.length).toBeLessThan(50 * 1024);
    expect(truncateToolOutput(output)).toBe(output);
  });

  it("applies line truncation before char truncation", () => {
    // 3000 very long lines — should first cut to 2000 lines, then to 50KB
    const lines = Array.from({ length: 3000 }, () => "y".repeat(100));
    const big = lines.join("\n");
    const result = truncateToolOutput(big) as string;
    expect(result).toContain("[Output was truncated");
  });
});

// ---------- wrapToolsWithTruncation ----------

describe("wrapToolsWithTruncation", () => {
  it("wraps tool execute functions", async () => {
    const tools = {
      "my-tool": {
        description: "test",
        parameters: {},
        execute: async () => "small result",
      },
    } as any;

    const wrapped = wrapToolsWithTruncation(tools);
    const result = await wrapped["my-tool"].execute?.({}, {} as any);
    expect(result).toBe("small result");
  });

  it("truncates large tool results after execution", async () => {
    const tools = {
      "big-tool": {
        description: "test",
        parameters: {},
        execute: async () => "z".repeat(60 * 1024),
      },
    } as any;

    const wrapped = wrapToolsWithTruncation(tools);
    const result = (await wrapped["big-tool"].execute?.(
      {},
      {} as any
    )) as string;
    expect(result).toContain("[Output was truncated");
    expect(result.length).toBeLessThan(60 * 1024);
  });

  it("passes through tools without execute", () => {
    const tools = {
      "no-exec": {
        description: "test",
        parameters: {},
      },
    } as any;

    const wrapped = wrapToolsWithTruncation(tools);
    expect(wrapped["no-exec"].execute).toBeUndefined();
    expect(wrapped["no-exec"].description).toBe("test");
  });

  it("preserves tool properties besides execute", () => {
    const tools = {
      "my-tool": {
        description: "my desc",
        parameters: { type: "object" },
        execute: async () => "result",
      },
    } as any;

    const wrapped = wrapToolsWithTruncation(tools);
    expect(wrapped["my-tool"].description).toBe("my desc");
    expect(wrapped["my-tool"].parameters).toEqual({ type: "object" });
  });
});
