import { getOrgAgentTools } from "@workspace/agent";
import { describe, expect, it } from "vitest";

/**
 * ALW-348 / ALW-456 / ALW-524 / ALW-740 — human-approval-gated agent writes.
 *
 * After removing codemode, ERP tools (including `delete_product`) are top-level
 * Think tools. `needsApproval: true` uses the AI SDK approval pause
 * (`approval-requested` → DefaultTool Approve/Reject via
 * `addToolApprovalResponse`).
 *
 * The live end-to-end (model calls the tool → chat renders Approve/Reject →
 * resume) needs a real facet + model and is verified in `pnpm dev` — see
 * org-agent.workerd.test.ts for why the harness can't drive it.
 */

const ctx = {
  organizationId: "org_test",
  userId: "user_test",
  waitUntil: () => undefined,
};

describe("top-level approval-gated writes (ALW-456 / ALW-740)", () => {
  it("delete_product is in the org tool set with needsApproval", () => {
    const tools = getOrgAgentTools(ctx);
    expect(tools).toHaveProperty("delete_product");
    const deleteTool = tools.delete_product as {
      needsApproval?: unknown;
    };
    expect(deleteTool.needsApproval).toBe(true);
    // The reversible catalog writes stay autonomous (no approval gate).
    expect(tools).toHaveProperty("create_product");
    expect(tools).toHaveProperty("update_product");
    expect(
      (tools.create_product as { needsApproval?: unknown }).needsApproval
    ).toBeUndefined();
  });

  it("org tools are top-level (no codemode wrapper)", () => {
    const tools = getOrgAgentTools(ctx);
    expect(tools).not.toHaveProperty("codemode");
    expect(tools).toHaveProperty("list_products");
    expect(tools).toHaveProperty("get_product");
  });
});
