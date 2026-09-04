export const MCP_TOOL_NAMES = [
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
] as const;

export type McpToolName = (typeof MCP_TOOL_NAMES)[number];
