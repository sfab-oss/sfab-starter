import type { McpServer } from "@modelcontextprotocol/server";
import {
  getDocumentDescription,
  getDocumentExecute,
  getDocumentInputSchema,
  getDocumentName,
  listDocumentsDescription,
  listDocumentsExecute,
  listDocumentsInputSchema,
  listDocumentsName,
} from "../tool-parts/catalog/documents";
import {
  createProductDescription,
  createProductExecute,
  createProductInputSchema,
  createProductName,
  getProductDescription,
  getProductExecute,
  getProductInputSchema,
  getProductName,
  listProductsDescription,
  listProductsExecute,
  listProductsInputSchema,
  listProductsName,
  updateProductDescription,
  updateProductExecute,
  updateProductInputSchema,
  updateProductName,
} from "../tool-parts/catalog/products";
import {
  listActivityDescription,
  listActivityExecute,
  listActivityInputSchema,
  listActivityName,
} from "../tool-parts/transaction/activity";
import {
  getEntityDescription,
  getEntityExecute,
  getEntityInputSchema,
  getEntityName,
  listEntitiesDescription,
  listEntitiesExecute,
  listEntitiesInputSchema,
  listEntitiesName,
} from "../tool-parts/transaction/entities";
import {
  getOrganizationDescription,
  getOrganizationExecute,
  getOrganizationInputSchema,
  getOrganizationName,
} from "../tool-parts/transaction/organization";
import {
  getPaymentDescription,
  getPaymentExecute,
  getPaymentInputSchema,
  getPaymentName,
  listPaymentsDescription,
  listPaymentsExecute,
  listPaymentsInputSchema,
  listPaymentsName,
} from "../tool-parts/transaction/payments";
import {
  getCreditBalanceDescription,
  getCreditBalanceExecute,
  getCreditBalanceInputSchema,
  getCreditBalanceName,
  listCreditEntriesDescription,
  listCreditEntriesExecute,
  listCreditEntriesInputSchema,
  listCreditEntriesName,
} from "../tool-parts/transaction/wallet";
import type { AgentToolsContext } from "../types";
import { mcpTool } from "./mcp-tool";

export { mcpToolContext } from "./mcp-tool";
export { MCP_TOOL_NAMES, type McpToolName } from "./mcp-tool-names";

export function registerMcpTools(
  server: McpServer,
  ctx: AgentToolsContext
): void {
  const bind = mcpTool(server, ctx);
  bind({
    name: listProductsName,
    description: listProductsDescription,
    inputSchema: listProductsInputSchema,
    execute: listProductsExecute,
  });
  bind({
    name: getProductName,
    description: getProductDescription,
    inputSchema: getProductInputSchema,
    execute: getProductExecute,
  });
  bind({
    name: listDocumentsName,
    description: listDocumentsDescription,
    inputSchema: listDocumentsInputSchema,
    execute: listDocumentsExecute,
  });
  bind({
    name: getDocumentName,
    description: getDocumentDescription,
    inputSchema: getDocumentInputSchema,
    execute: getDocumentExecute,
  });
  bind({
    name: listPaymentsName,
    description: listPaymentsDescription,
    inputSchema: listPaymentsInputSchema,
    execute: listPaymentsExecute,
  });
  bind({
    name: getPaymentName,
    description: getPaymentDescription,
    inputSchema: getPaymentInputSchema,
    execute: getPaymentExecute,
  });
  bind({
    name: getCreditBalanceName,
    description: getCreditBalanceDescription,
    inputSchema: getCreditBalanceInputSchema,
    execute: getCreditBalanceExecute,
  });
  bind({
    name: listCreditEntriesName,
    description: listCreditEntriesDescription,
    inputSchema: listCreditEntriesInputSchema,
    execute: listCreditEntriesExecute,
  });
  bind({
    name: listEntitiesName,
    description: listEntitiesDescription,
    inputSchema: listEntitiesInputSchema,
    execute: listEntitiesExecute,
  });
  bind({
    name: getEntityName,
    description: getEntityDescription,
    inputSchema: getEntityInputSchema,
    execute: getEntityExecute,
  });
  bind({
    name: getOrganizationName,
    description: getOrganizationDescription,
    inputSchema: getOrganizationInputSchema,
    execute: getOrganizationExecute,
  });
  bind({
    name: listActivityName,
    description: listActivityDescription,
    inputSchema: listActivityInputSchema,
    execute: listActivityExecute,
  });
  bind({
    name: createProductName,
    description: createProductDescription,
    inputSchema: createProductInputSchema,
    execute: createProductExecute,
  });
  bind({
    name: updateProductName,
    description: updateProductDescription,
    inputSchema: updateProductInputSchema,
    execute: updateProductExecute,
  });
}
