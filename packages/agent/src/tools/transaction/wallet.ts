import {
  getCreditBalance,
  listCreditEntries,
} from "@workspace/core/transaction";
import { tool } from "ai";
import { z } from "zod";
import type { AgentToolsContext } from "../../types";

// Read-only customer-credit / wallet tools (ALW-402, ALW-355). Store credit
// ("saldo a favor" / anticipos) is a ledger; the balance is its running sum.
// All reads, org-scoped — deposits/redemptions/reversals are never agent tools.
export const createWalletReadTools = (
  ctx: Pick<AgentToolsContext, "organizationId">
) => {
  const orgId = ctx.organizationId;
  return {
    "get-credit-balance": tool({
      description:
        "Get a customer's store-credit balance (saldo a favor / anticipos) as an integer minor-unit amount. Positive = credit the business owes the customer.",
      inputSchema: z.object({ entityId: z.string() }),
      execute: async ({ entityId }) => ({
        entityId,
        balance: await getCreditBalance(entityId, orgId),
      }),
    }),
    "list-credit-entries": tool({
      description:
        "List store-credit ledger entries (deposits, redemptions, corrections), newest first. Optionally filter to one customer/entity.",
      inputSchema: z.object({
        entityId: z
          .string()
          .optional()
          .describe("Filter to ledger entries for a single entity (customer)."),
      }),
      execute: async ({ entityId }) => listCreditEntries(orgId, { entityId }),
    }),
  };
};
