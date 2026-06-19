import { z } from "zod";

export const selectStockLevelSchema = z.object({
  id: z.string(),
  productId: z.string(),
  warehouseId: z.string(),
  quantity: z.number(),
  updatedAt: z.string(),
});

export type SelectStockLevel = z.infer<typeof selectStockLevelSchema>;
