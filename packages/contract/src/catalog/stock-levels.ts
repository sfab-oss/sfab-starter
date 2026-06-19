import { z } from "zod";

// ── DB-derived schema (hand-written zod mirroring the stock_levels table) ─

export const selectStockLevelSchema = z.object({
  id: z.string(),
  productId: z.string(),
  warehouseId: z.string(),
  quantity: z.number(),
  updatedAt: z.string(),
});

export type SelectStockLevel = z.infer<typeof selectStockLevelSchema>;
