import {
  getPaymentWithAllocations,
  listPayments,
} from "@workspace/core/transaction";
import { tool } from "ai";
import { z } from "zod";
import type { AgentToolsContext } from "../../types";

// Read-only payment tools over the transaction core (ALW-402). They need only
// `organizationId`, so they compose for the parent chat AND the read-only
// sub-agent. Money/document MUTATIONS (recordPayment/reversePayment) stay off
// the agent by convention (guard.ts) — the agent reasons over settlement state,
// it never authors it. Amounts are integer minor units (ADR-006).
export const createPaymentReadTools = (
  ctx: Pick<AgentToolsContext, "organizationId">
) => {
  const orgId = ctx.organizationId;
  return {
    "list-payments": tool({
      description:
        "List recorded payments (money received/applied), newest first. Optionally filter to one customer/entity. Amounts are integer minor units.",
      inputSchema: z.object({
        entityId: z
          .string()
          .optional()
          .describe("Filter to payments for a single entity (customer)."),
      }),
      execute: async ({ entityId }) => listPayments(orgId, { entityId }),
    }),
    "get-payment": tool({
      description:
        "Get a single payment with its allocations — the documents (invoices/orders) it was applied to and how much went to each.",
      inputSchema: z.object({ id: z.string() }),
      execute: async ({ id }) => getPaymentWithAllocations(id, orgId),
    }),
  };
};
