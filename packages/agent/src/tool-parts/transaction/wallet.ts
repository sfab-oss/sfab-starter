import {
  getCreditBalance,
  listCreditEntries,
} from "@workspace/core/transaction";
import { z } from "zod";
import type { ToolContext } from "../context";

export const getCreditBalanceName = "get_credit_balance";

export const getCreditBalanceDescription =
  "Get a customer's store-credit balance (saldo a favor / anticipos) as an integer minor-unit amount. Positive = credit the business owes the customer.";

export const getCreditBalanceInputSchema = z.object({ entityId: z.string() });

export async function getCreditBalanceExecute(
  ctx: ToolContext,
  input: z.infer<typeof getCreditBalanceInputSchema>
): Promise<unknown> {
  return {
    entityId: input.entityId,
    balance: await getCreditBalance(input.entityId, ctx.organizationId),
  };
}

export const listCreditEntriesName = "list_credit_entries";

export const listCreditEntriesDescription =
  "List store-credit ledger entries (deposits, redemptions, corrections), newest first. Optionally filter to one customer/entity.";

export const listCreditEntriesInputSchema = z.object({
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
});

export async function listCreditEntriesExecute(
  ctx: ToolContext,
  input: z.infer<typeof listCreditEntriesInputSchema>
): Promise<unknown> {
  return (
    await listCreditEntries(ctx.organizationId, { entityId: input.entityId })
  ).slice(0, input.limit ?? 50);
}
