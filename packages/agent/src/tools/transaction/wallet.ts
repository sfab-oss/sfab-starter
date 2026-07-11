import {
  getCreditBalance,
  listCreditEntries,
} from "@workspace/core/transaction";
import { z } from "zod";
import type { AgentToolsContext } from "../../types";
import { defineOrgTool } from "../define-org-tool";

// Read-only customer-credit / wallet tools (ALW-402, ALW-355). Store credit
// ("saldo a favor" / anticipos) is a ledger; the balance is its running sum.
// All reads, org-scoped — deposits/redemptions/reversals are never agent tools.
export const createWalletReadTools = (
  ctx: Pick<AgentToolsContext, "organizationId">
) => {
  const orgId = ctx.organizationId;
  return {
    get_credit_balance: defineOrgTool({
      description:
        "Get a customer's store-credit balance (saldo a favor / anticipos) as an integer minor-unit amount. Positive = credit the business owes the customer.",
      inputSchema: z.object({ entityId: z.string() }),
      execute: async ({ entityId }) => ({
        entityId,
        balance: await getCreditBalance(entityId, orgId),
      }),
    }),
    list_credit_entries: defineOrgTool({
      description:
        "List store-credit ledger entries (deposits, redemptions, corrections), newest first. Optionally filter to one customer/entity.",
      inputSchema: z.object({
        entityId: z
          .string()
          .optional()
          .describe("Filter to ledger entries for a single entity (customer)."),
        limit: z
          .number()
          .int()
          .positive()
          .max(200)
          .optional()
          .describe("Max rows to return (default 50)."),
      }),
      // Cap the rows handed back to the model (context safety); read stays org-scoped.
      execute: async ({ entityId, limit }) =>
        (await listCreditEntries(orgId, { entityId })).slice(0, limit ?? 50),
    }),
  };
};
