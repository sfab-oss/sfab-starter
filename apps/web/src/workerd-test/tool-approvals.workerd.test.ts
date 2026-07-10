import { ToolSetConnector } from "@cloudflare/codemode/ai";
import { getOrgAgentApprovalTools, getOrgAgentTools } from "@workspace/agent";
import { type ToolSet, tool } from "ai";
import { describe, expect, it } from "vitest";
import { z } from "zod";

/**
 * ALW-348 / ALW-456 — human-approval-gated agent writes.
 *
 * AC-1: confirm, against the INSTALLED codemode, that a `needsApproval` tool is
 * NOT silently stripped (the old 0.3.8 bug) — the `ToolSetConnector` that
 * `createExecuteTool` builds maps it to codemode `requiresApproval: true` (a
 * durable pause). AC-4: the gated write (`delete_product`) lives IN the
 * codemode set with `needsApproval` (ALW-456); top-level approval tools are
 * an empty deprecated stub.
 *
 * The live end-to-end (model calls the tool → chat renders Approve/Reject →
 * `approveExecution` resumes) needs a real facet + model and is verified in
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
      tools: () => Record<string, { requiresApproval?: boolean }>;
    }
  ).tools();
}

describe("codemode approval mapping (AC-1) — needsApproval pauses, not strips", () => {
  it("maps a needsApproval tool to requiresApproval, keeping it callable", () => {
    const mapped = mapThroughCodemode({
      risky: tool({
        description: "A gated action.",
        execute: async () => "ran",
        inputSchema: z.object({ id: z.string() }),
        needsApproval: true,
      }),
      safe: tool({
        description: "An autonomous action.",
        execute: async () => "ran",
        inputSchema: z.object({ id: z.string() }),
      }),
    });

    // Not stripped: both tools survive into the sandbox surface.
    expect(Object.keys(mapped).sort()).toEqual(["risky", "safe"]);
    // Gated → durable-approval flag; ungated → no flag.
    expect(mapped.risky?.requiresApproval).toBe(true);
    expect(mapped.safe?.requiresApproval).toBeUndefined();
  });
});

describe("in-codemode approval-gated writes (AC-4 / ALW-456)", () => {
  it("delete_product is in the codemode set with needsApproval", () => {
    const codemodeTools = getOrgAgentTools(ctx);
    expect(codemodeTools).toHaveProperty("delete_product");
    const deleteTool = codemodeTools.delete_product as {
      needsApproval?: unknown;
    };
    expect(deleteTool.needsApproval).toBe(true);
    // The reversible catalog writes stay autonomous (no approval gate).
    expect(codemodeTools).toHaveProperty("create_product");
    expect(codemodeTools).toHaveProperty("update_product");
    expect(
      (codemodeTools.create_product as { needsApproval?: unknown })
        .needsApproval
    ).toBeUndefined();
  });

  it("top-level approval tools are an empty deprecated stub", () => {
    expect(getOrgAgentApprovalTools(ctx)).toEqual({});
  });

  it("delete_product maps through ToolSetConnector with requiresApproval", () => {
    // Tool names are authored in snake_case so they match the sandbox identifiers without rename.
    const mapped = mapThroughCodemode(getOrgAgentTools(ctx));
    expect(mapped.delete_product?.requiresApproval).toBe(true);
    expect(mapped.create_product?.requiresApproval).toBeUndefined();
  });
});
