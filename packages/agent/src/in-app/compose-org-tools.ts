import type { ToolSet } from "ai";
import {
  getDocumentDescription,
  getDocumentExecute,
  getDocumentInputSchema,
  getDocumentName,
  listDocumentsDescription,
  listDocumentsExecute,
  listDocumentsInputSchema,
  listDocumentsName,
  listDocumentsOutputSchema,
} from "../tool-parts/catalog/documents";
import {
  createProductDescription,
  createProductExecute,
  createProductInputSchema,
  createProductName,
  deleteProductDescription,
  deleteProductExecute,
  deleteProductInputSchema,
  deleteProductName,
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
import { readOnlyToolContext } from "../tool-parts/context";
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
import { createDisplayTools } from "./display";
import { inAppTool } from "./in-app-tool";

function bindErpReadTools(bind: ReturnType<typeof inAppTool>): ToolSet {
  return {
    [listProductsName]: bind({
      name: listProductsName,
      description: listProductsDescription,
      inputSchema: listProductsInputSchema,
      execute: listProductsExecute,
    }),
    [getProductName]: bind({
      name: getProductName,
      description: getProductDescription,
      inputSchema: getProductInputSchema,
      execute: getProductExecute,
    }),
    [listDocumentsName]: bind({
      name: listDocumentsName,
      description: listDocumentsDescription,
      inputSchema: listDocumentsInputSchema,
      outputSchema: listDocumentsOutputSchema,
      execute: listDocumentsExecute,
    }),
    [getDocumentName]: bind({
      name: getDocumentName,
      description: getDocumentDescription,
      inputSchema: getDocumentInputSchema,
      execute: getDocumentExecute,
    }),
    [listPaymentsName]: bind({
      name: listPaymentsName,
      description: listPaymentsDescription,
      inputSchema: listPaymentsInputSchema,
      execute: listPaymentsExecute,
    }),
    [getPaymentName]: bind({
      name: getPaymentName,
      description: getPaymentDescription,
      inputSchema: getPaymentInputSchema,
      execute: getPaymentExecute,
    }),
    [getCreditBalanceName]: bind({
      name: getCreditBalanceName,
      description: getCreditBalanceDescription,
      inputSchema: getCreditBalanceInputSchema,
      execute: getCreditBalanceExecute,
    }),
    [listCreditEntriesName]: bind({
      name: listCreditEntriesName,
      description: listCreditEntriesDescription,
      inputSchema: listCreditEntriesInputSchema,
      execute: listCreditEntriesExecute,
    }),
    [listEntitiesName]: bind({
      name: listEntitiesName,
      description: listEntitiesDescription,
      inputSchema: listEntitiesInputSchema,
      execute: listEntitiesExecute,
    }),
    [getEntityName]: bind({
      name: getEntityName,
      description: getEntityDescription,
      inputSchema: getEntityInputSchema,
      execute: getEntityExecute,
    }),
    [getOrganizationName]: bind({
      name: getOrganizationName,
      description: getOrganizationDescription,
      inputSchema: getOrganizationInputSchema,
      execute: getOrganizationExecute,
    }),
    [listActivityName]: bind({
      name: listActivityName,
      description: listActivityDescription,
      inputSchema: listActivityInputSchema,
      execute: listActivityExecute,
    }),
  };
}

/** Top-level ERP tools for OrgChat. Authoring guide: `docs/guides/writing-agent-tools.md`. */
export const getOrgAgentTools = (ctx: AgentToolsContext): ToolSet => {
  const bind = inAppTool(ctx);
  return {
    ...bindErpReadTools(bind),
    [createProductName]: bind({
      name: createProductName,
      description: createProductDescription,
      inputSchema: createProductInputSchema,
      execute: createProductExecute,
    }),
    [updateProductName]: bind({
      name: updateProductName,
      description: updateProductDescription,
      inputSchema: updateProductInputSchema,
      execute: updateProductExecute,
    }),
    [deleteProductName]: bind({
      name: deleteProductName,
      description: deleteProductDescription,
      inputSchema: deleteProductInputSchema,
      needsApproval: true,
      execute: deleteProductExecute,
    }),
  };
};

export const getOrgAgentDisplayTools = (ctx: AgentToolsContext): ToolSet =>
  createDisplayTools(ctx);

/** Read-only reach for delegated sub-agents (`OrgSubAgent`). */
export const getOrgAgentReadOnlyTools = (
  ctx: Pick<AgentToolsContext, "organizationId">
): ToolSet =>
  bindErpReadTools(inAppTool(readOnlyToolContext(ctx.organizationId)));
