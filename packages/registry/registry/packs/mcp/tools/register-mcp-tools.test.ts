import { describe, expect, it } from "vitest";
import { MCP_TOOL_NAMES } from "./mcp-tool-names";

describe("MCP tool name list", () => {
  it("exposes 12 reads plus create_product and update_product", () => {
    expect(MCP_TOOL_NAMES).toHaveLength(14);
    expect(MCP_TOOL_NAMES).toEqual([
      "list_products",
      "get_product",
      "list_documents",
      "get_document",
      "list_payments",
      "get_payment",
      "get_credit_balance",
      "list_credit_entries",
      "list_entities",
      "get_entity",
      "get_organization",
      "list_activity",
      "create_product",
      "update_product",
    ]);
  });

  it("omits delete_product and display tools", () => {
    expect(MCP_TOOL_NAMES).not.toContain("delete_product");
    expect(MCP_TOOL_NAMES.some((name) => name.startsWith("display_"))).toBe(
      false
    );
  });
});
