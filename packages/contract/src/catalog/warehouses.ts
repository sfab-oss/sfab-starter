import { z } from "zod";

// ── DB-derived schemas (hand-written zod mirroring the warehouses table) ─

export const selectWarehouseSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  location: z.string().nullable(),
  isDefault: z.boolean(),
  createdAt: z.string(),
});

export const insertWarehouseSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  location: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
});

export const updateWarehouseSchema = z.object({
  name: z.string().min(2).optional(),
  location: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
});

export type SelectWarehouse = z.infer<typeof selectWarehouseSchema>;
export type InsertWarehouse = z.infer<typeof insertWarehouseSchema>;
export type UpdateWarehouse = z.infer<typeof updateWarehouseSchema>;

// ── Public API aliases ──────────────────────────────────────────────

export type { SelectWarehouse as Warehouse };
export type { InsertWarehouse as CreateWarehouse };
export {
  insertWarehouseSchema as createWarehouseSchema,
  selectWarehouseSchema as warehouseSchema,
};

// ── Form schemas ────────────────────────────────────────────────────

export const warehouseFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  location: z.string().nullable(),
  isDefault: z.boolean(),
});

export const warehouseListSchema = z.array(
  z.object({
    id: z.string(),
    organizationId: z.string(),
    name: z.string(),
    location: z.string().nullable(),
    isDefault: z.boolean(),
    createdAt: z.string(),
  })
);

export type WarehouseList = z.infer<typeof warehouseListSchema>;
