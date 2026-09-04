import {
  getPaymentWithAllocations,
  listPayments,
} from "@workspace/core/transaction";
import { z } from "zod";
import { requireFound } from "../../tools/tool-result";
import type { ToolContext } from "../context";

export const listPaymentsName = "list_payments";

export const listPaymentsDescription =
  "List recorded payments (money received/applied), newest first. Optionally filter to one customer/entity. Amounts are integer minor units.";

export const listPaymentsInputSchema = z.object({
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
});

export async function listPaymentsExecute(
  ctx: ToolContext,
  input: z.infer<typeof listPaymentsInputSchema>
): Promise<unknown> {
  const rows = await listPayments(ctx.organizationId, {
    entityId: input.entityId,
  });
  return rows.slice(0, input.limit ?? 50);
}

export const getPaymentName = "get_payment";

export const getPaymentDescription =
  "Get a single payment with its allocations — the documents (invoices/orders) it was applied to and how much went to each.";

export const getPaymentInputSchema = z.object({ id: z.string() });

export async function getPaymentExecute(
  ctx: ToolContext,
  input: z.infer<typeof getPaymentInputSchema>
): Promise<unknown> {
  return requireFound(
    await getPaymentWithAllocations(input.id, ctx.organizationId),
    `Payment not found: ${input.id}`
  );
}
