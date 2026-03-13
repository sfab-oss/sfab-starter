import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod";
import { warehouses } from "../schema/inventory";

export const selectWarehouseSchema = createSelectSchema(warehouses);

export const insertWarehouseSchema = createInsertSchema(warehouses, {
  name: z.string().min(2, "Name must be at least 2 characters"),
}).omit({ userId: true, id: true, createdAt: true });

export const updateWarehouseSchema = createUpdateSchema(warehouses, {
  name: z.string().min(2),
}).omit({ userId: true, id: true, createdAt: true });

export type SelectWarehouse = z.infer<typeof selectWarehouseSchema>;
export type InsertWarehouse = z.infer<typeof insertWarehouseSchema>;
export type UpdateWarehouse = z.infer<typeof updateWarehouseSchema>;
