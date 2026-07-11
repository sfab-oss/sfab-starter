import {
  getPaymentWithAllocations,
  listPayments,
} from "@workspace/core/transaction";
import { z } from "zod";
import type { AgentToolsContext } from "../../types";
import { defineOrgTool } from "../define-org-tool";

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
    list_payments: defineOrgTool({
      description:
        "List recorded payments (money received/applied), newest first. Optionally filter to one customer/entity. Amounts are integer minor units.",
      inputSchema: z.object({
        entityId: z
          .string()
          .optional()
          .describe("Filter to payments for a single entity (customer)."),
        limit: z
          .number()
          .int()
          .positive()
          .max(200)
          .optional()
          .describe("Max rows to return (default 50)."),
      }),
      // Cap the rows handed back to the model so a large ledger can't blow the
      // agent's context in one call. The DB read stays org-scoped either way.
      execute: async ({ entityId, limit }) =>
        (await listPayments(orgId, { entityId })).slice(0, limit ?? 50),
    }),
    get_payment: defineOrgTool({
      description:
        "Get a single payment with its allocations — the documents (invoices/orders) it was applied to and how much went to each.",
      inputSchema: z.object({ id: z.string() }),
      requireData: true,
      notFoundMessage: ({ id }) => `Payment not found: ${id}`,
      execute: async ({ id }) => getPaymentWithAllocations(id, orgId),
    }),
  };
};
