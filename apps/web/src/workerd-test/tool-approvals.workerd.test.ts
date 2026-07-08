import { ToolSetConnector } from "@cloudflare/codemode/ai";
import { getOrgAgentApprovalTools, getOrgAgentTools } from "@workspace/agent";
import { type ToolSet, tool } from "ai";
import { describe, expect, it } from "vitest";
import { z } from "zod";

/**
 * ALW-348 — human-approval-gated agent writes.
 *
 * AC-1: confirm, against the INSTALLED codemode, that a `needsApproval` tool is
 * NOT silently stripped (the old 0.3.8 bug) — the `ToolSetConnector` that
 * `createExecuteTool` builds maps it to codemode `requiresApproval: true` (a
 * durable pause). AC-4: the one gated write (`delete-product`) is exposed
 * top-level with `needsApproval` and kept OUT of the autonomous codemode set.
 *
 * The live end-to-end (model calls the tool → chat renders Approve/Reject →
 * `execute` runs on approve) needs a real facet + model and is verified in
 * `pnpm dev` — see org-agent.workerd.test.ts for why the harness can't drive it.
 */

const ctx = {
  organizationId: "org_test",
  userId: "user_test",
  waitUntil: () => undefined,
};

// The ToolSetConnector constructor only stores its first arg and `tools()`
// never reads it, so a light fake context is enough to exercise the mapping.
function mapThroughCodemode(
  tools: ToolSet
): Record<string, { requiresApproval?: boolean }> {
  const connector = new ToolSetConnector({} as unknown as ExecutionContext, {
    tools,
  });
  // `tools()` is protected; re-type through `unknown` to read the descriptors
  // codemode would hand the sandbox runtime.
  return (
    connector as unknown as {
      tools(): Record<string, { requiresApproval?: boolean }>;
    }
  ).tools();
}

describe("codemode approval mapping (AC-1) — needsApproval pauses, not strips", () => {
  it("maps a needsApproval tool to requiresApproval, keeping it callable", () => {
    const mapped = mapThroughCodemode({
      risky: tool({
        description: "A gated action.",
        inputSchema: z.object({ id: z.string() }),
        needsApproval: true,
        execute: async () => "ran",
      }),
      safe: tool({
        description: "An autonomous action.",
        inputSchema: z.object({ id: z.string() }),
        execute: async () => "ran",
      }),
    });

    // Not stripped: both tools survive into the sandbox surface.
    expect(Object.keys(mapped).sort()).toEqual(["risky", "safe"]);
    // Gated → durable-approval flag; ungated → no flag.
    expect(mapped.risky?.requiresApproval).toBe(true);
    expect(mapped.safe?.requiresApproval).toBeUndefined();
  });
});

describe("top-level approval-gated writes (AC-4)", () => {
  it("delete-product is exposed with needsApproval", () => {
    const tools = getOrgAgentApprovalTools(ctx);
    expect(Object.keys(tools)).toEqual(["delete-product"]);
    const deleteTool = tools["delete-product"] as { needsApproval?: unknown };
    expect(deleteTool.needsApproval).toBe(true);
  });

  it("delete-product is NOT in the autonomous codemode set", () => {
    const codemodeTools = getOrgAgentTools(ctx);
    expect(codemodeTools).not.toHaveProperty("delete-product");
    // The reversible catalog writes stay autonomous (no approval gate).
    expect(codemodeTools).toHaveProperty("create-product");
    expect(codemodeTools).toHaveProperty("update-product");
    expect(
      (getOrgAgentTools(ctx)["create-product"] as { needsApproval?: unknown })
        .needsApproval
    ).toBeUndefined();
  });
});
