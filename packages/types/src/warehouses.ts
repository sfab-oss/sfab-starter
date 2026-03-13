import { z } from "zod";

// ── DB-derived types (source of truth: Drizzle → drizzle-zod) ──────

export type {
  InsertWarehouse as CreateWarehouse,
  SelectWarehouse as Warehouse,
  UpdateWarehouse,
} from "@workspace/db-d1/types/warehouses";
// biome-ignore lint/performance/noBarrelFile: Re-exports as public API
export {
  insertWarehouseSchema as createWarehouseSchema,
  selectWarehouseSchema as warehouseSchema,
  updateWarehouseSchema,
} from "@workspace/db-d1/types/warehouses";

// ── Form schemas ────────────────────────────────────────────────────

export const warehouseFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  location: z.string().nullable(),
  isDefault: z.boolean(),
});

export const warehouseListSchema = z.array(
  z.object({
    id: z.string(),
    userId: z.string(),
    name: z.string(),
    location: z.string().nullable(),
    isDefault: z.boolean(),
    createdAt: z.string(),
  })
);

export type WarehouseList = z.infer<typeof warehouseListSchema>;
