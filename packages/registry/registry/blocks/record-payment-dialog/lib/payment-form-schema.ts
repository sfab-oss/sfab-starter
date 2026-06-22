import { z } from "zod";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function createPaymentFormSchema(balanceMinor: number) {
  return z.object({
    amountMinor: z
      .number()
      .int("Amount must be a whole number of minor units")
      .positive("Amount must be greater than zero")
      .max(balanceMinor, "Amount cannot exceed the open balance"),
    paymentDate: z.string().regex(ISO_DATE_PATTERN, "Select a payment date"),
    reference: z.string().max(120).optional(),
  });
}

export type PaymentFormValues = z.infer<
  ReturnType<typeof createPaymentFormSchema>
>;
