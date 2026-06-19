import { z } from "zod";

const selectWarehouseSchema = z.object({
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

export type UpdateWarehouse = z.infer<typeof updateWarehouseSchema>;

export type Warehouse = z.infer<typeof selectWarehouseSchema>;
export type CreateWarehouse = z.infer<typeof insertWarehouseSchema>;
export {
  insertWarehouseSchema as createWarehouseSchema,
  selectWarehouseSchema as warehouseSchema,
};

export const warehouseFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  location: z.string().nullable(),
  isDefault: z.boolean(),
});

export const warehouseListSchema = z.array(selectWarehouseSchema);
