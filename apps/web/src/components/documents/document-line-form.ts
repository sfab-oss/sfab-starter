import { z } from "zod";

/** Major-unit UI defaults for draft add-line (API still receives minor + bps). */
export const addLineFormSchema = z.object({
  productId: z.string().optional(),
  description: z.string().trim().min(1, "Description is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  unitPriceMajor: z.number().min(0, "Unit price cannot be negative"),
  taxPercent: z
    .number()
    .min(0, "Tax cannot be negative")
    .max(100, "Tax cannot exceed 100%"),
});

export type AddLineFormValues = z.infer<typeof addLineFormSchema>;
