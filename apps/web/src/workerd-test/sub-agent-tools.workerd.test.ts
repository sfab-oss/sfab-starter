import { getOrgAgentReadOnlyTools, getOrgAgentTools } from "@workspace/agent";
import { describe, expect, it } from "vitest";

const MUTATING_TOOL_NAME = /create|update|delete|write|void|reverse/;

/**
 * ALW-401 — the delegation sub-agent (`OrgSubAgent`) is deliberately read-only.
 * It runs without an acting user, so it must never receive a tool that mutates
 * data. These tests lock that invariant on the composition it is built from, so
 * a future write tool added to the read-only reach fails here (not in prod).
 *
 * The live sub-agent turn itself needs a real facet + model and is verified in
 * `pnpm dev` (the harness can't spawn facets — see org-agent.workerd.test.ts).
 */
describe("OrgSubAgent read-only tool composition", () => {
  const ctx = { organizationId: "org_test" };

  it("exposes only read tools (catalog + transaction-core reach — ALW-402)", () => {
    const tools = getOrgAgentReadOnlyTools(ctx);
    const names = Object.keys(tools).sort();
    expect(names).toEqual([
      "get_credit_balance",
      "get_document",
      "get_entity",
      "get_organization",
      "get_payment",
      "get_product",
      "list_activity",
      "list_credit_entries",
      "list_documents",
      "list_entities",
      "list_payments",
      "list_products",
    ]);
  });

  it("never includes a mutating tool", () => {
    const names = Object.keys(getOrgAgentReadOnlyTools(ctx));
    for (const name of names) {
      expect(name).not.toMatch(MUTATING_TOOL_NAME);
    }
  });

  it("is a strict subset of the full org tool reach", () => {
    // The full (parent OrgChat) reach needs an acting user for its write tools.
    const full = getOrgAgentTools({
      organizationId: "org_test",
      userId: "user_test",
      waitUntil: () => undefined,
    });
    const readOnly = getOrgAgentReadOnlyTools(ctx);
    for (const name of Object.keys(readOnly)) {
      expect(full).toHaveProperty(name);
    }
    // And the full reach really does carry writes the read-only set drops.
    expect(Object.keys(full)).toContain("create_product");
    expect(getOrgAgentReadOnlyTools(ctx)).not.toHaveProperty("create_product");
  });
});
