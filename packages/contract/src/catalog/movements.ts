import { z } from "zod";

// ── DB-derived schemas (hand-written zod mirroring the movements table) ─

export const selectMovementSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  productId: z.string(),
  fromWarehouseId: z.string().nullable(),
  toWarehouseId: z.string().nullable(),
  type: z.enum(["IN", "OUT", "TRANSFER", "ADJUSTMENT"]),
  quantity: z.number(),
  notes: z.string().nullable(),
  createdAt: z.string(),
});

export const insertMovementSchema = z.object({
  productId: z.string(),
  fromWarehouseId: z.string().nullable().optional(),
  toWarehouseId: z.string().nullable().optional(),
  type: z.enum(["IN", "OUT", "TRANSFER", "ADJUSTMENT"]),
  quantity: z.number(),
  notes: z.string().nullable().optional(),
});

export type SelectMovement = z.infer<typeof selectMovementSchema>;
export type InsertMovement = z.infer<typeof insertMovementSchema>;
