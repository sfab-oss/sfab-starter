import { z } from "zod";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const invoiceEditSchema = z.object({
  dueDate: z.string().regex(ISO_DATE_PATTERN, "Select a due date"),
  notes: z.string().max(500).optional(),
});

export type InvoiceEditValues = z.infer<typeof invoiceEditSchema>;
