import { describe, expect, it } from "vitest";
import {
  createDoomLoopWarningMessage,
  detectDoomLoop,
} from "../../src/lib/ai/utils/context/doom-loop";

// ---------- helpers ----------

function makeStep(toolCalls: Array<{ toolName: string; input: unknown }>) {
  return {
    toolCalls: toolCalls.map((tc) => ({
      type: "tool-call" as const,
      toolCallId: `call-${crypto.randomUUID()}`,
      toolName: tc.toolName,
      input: tc.input,
    })),
  } as any;
}

function makeStepWithNoToolCalls() {
  return { toolCalls: [] } as any;
}

// ---------- detectDoomLoop ----------

describe("detectDoomLoop", () => {
  it("returns false with 0 steps", () => {
    expect(detectDoomLoop([])).toBe(false);
  });

  it("returns false with 1 step", () => {
    const steps = [makeStep([{ toolName: "search", input: { q: "test" } }])];
    expect(detectDoomLoop(steps)).toBe(false);
  });

  it("returns false with 2 identical steps (below threshold)", () => {
    const steps = [
      makeStep([{ toolName: "search", input: { q: "test" } }]),
      makeStep([{ toolName: "search", input: { q: "test" } }]),
    ];
    expect(detectDoomLoop(steps)).toBe(false);
  });

  it("returns true with 3 identical tool calls", () => {
    const steps = [
      makeStep([{ toolName: "search", input: { q: "test" } }]),
      makeStep([{ toolName: "search", input: { q: "test" } }]),
      makeStep([{ toolName: "search", input: { q: "test" } }]),
    ];
    expect(detectDoomLoop(steps)).toBe(true);
  });

  it("returns false with 3 steps but different tool names", () => {
    const steps = [
      makeStep([{ toolName: "search", input: { q: "test" } }]),
      makeStep([{ toolName: "list", input: { q: "test" } }]),
      makeStep([{ toolName: "search", input: { q: "test" } }]),
    ];
    expect(detectDoomLoop(steps)).toBe(false);
  });

  it("returns false with same tool name but different inputs", () => {
    const steps = [
      makeStep([{ toolName: "search", input: { q: "first" } }]),
      makeStep([{ toolName: "search", input: { q: "second" } }]),
      makeStep([{ toolName: "search", input: { q: "third" } }]),
    ];
    expect(detectDoomLoop(steps)).toBe(false);
  });

  it("returns false when some steps have no tool calls", () => {
    const steps = [
      makeStep([{ toolName: "search", input: { q: "test" } }]),
      makeStepWithNoToolCalls(),
      makeStep([{ toolName: "search", input: { q: "test" } }]),
    ];
    expect(detectDoomLoop(steps)).toBe(false);
  });

  it("only checks the last 3 steps, ignoring earlier ones", () => {
    const steps = [
      // Old different step
      makeStep([{ toolName: "other", input: {} }]),
      // Last 3 identical
      makeStep([{ toolName: "search", input: { q: "test" } }]),
      makeStep([{ toolName: "search", input: { q: "test" } }]),
      makeStep([{ toolName: "search", input: { q: "test" } }]),
    ];
    expect(detectDoomLoop(steps)).toBe(true);
  });

  it("uses the last tool call from each step when multiple exist", () => {
    const steps = [
      makeStep([
        { toolName: "first", input: {} },
        { toolName: "search", input: { q: "test" } },
      ]),
      makeStep([
        { toolName: "other", input: {} },
        { toolName: "search", input: { q: "test" } },
      ]),
      makeStep([
        { toolName: "another", input: {} },
        { toolName: "search", input: { q: "test" } },
      ]),
    ];
    expect(detectDoomLoop(steps)).toBe(true);
  });

  it("compares inputs by value, not reference", () => {
    const steps = [
      makeStep([{ toolName: "search", input: { q: "test", page: 1 } }]),
      makeStep([{ toolName: "search", input: { q: "test", page: 1 } }]),
      makeStep([{ toolName: "search", input: { q: "test", page: 1 } }]),
    ];
    expect(detectDoomLoop(steps)).toBe(true);
  });

  it("detects difference in nested input", () => {
    const steps = [
      makeStep([
        { toolName: "search", input: { q: "test", filters: { active: true } } },
      ]),
      makeStep([
        { toolName: "search", input: { q: "test", filters: { active: true } } },
      ]),
      makeStep([
        {
          toolName: "search",
          input: { q: "test", filters: { active: false } },
        },
      ]),
    ];
    expect(detectDoomLoop(steps)).toBe(false);
  });
});

// ---------- createDoomLoopWarningMessage ----------

describe("createDoomLoopWarningMessage", () => {
  it("returns a user-role message", () => {
    const msg = createDoomLoopWarningMessage();
    expect(msg.role).toBe("user");
  });

  it("contains a warning about the loop", () => {
    const msg = createDoomLoopWarningMessage();
    const text = (msg as any).content[0].text;
    expect(text).toContain("loop");
    expect(text).toContain("different approach");
  });
});
