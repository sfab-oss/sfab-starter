import { selectProductSchema } from "@workspace/db-d1/types/products";
import { z } from "zod";
import { aiOptional } from "./utils";

// ── DB-derived schemas (source of truth: Drizzle → drizzle-zod) ─────
// These represent the raw DB row shape. Use for internal/service layer.

export type { SelectProduct } from "@workspace/db-d1/types/products";
// biome-ignore lint/performance/noBarrelFile: Re-exports as public API
export {
  insertProductSchema as dbInsertProductSchema,
  selectProductSchema,
  updateProductSchema as dbUpdateProductSchema,
} from "@workspace/db-d1/types/products";

// ── Composed types (DB row + computed join fields) ──────────────────

export const productWithStockSchema = selectProductSchema.extend({
  totalStock: z.number(),
});

export type ProductWithStock = z.infer<typeof productWithStockSchema>;

// Alias for backward compat — most consumers expect products with stock
export const productSchema = productWithStockSchema;
export type Product = ProductWithStock;

export const productsListSchema = z.array(productWithStockSchema);
export type ProductsList = z.infer<typeof productsListSchema>;

// ── API schemas (price as number, service converts to string for DB) ─

export const createProductSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  sku: z.string().min(2, "SKU must be at least 2 characters"),
  price: z.coerce.number().min(0, "Price must be positive").optional(),
  description: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  minStockLevel: z.coerce
    .number()
    .min(0, "Minimum stock must be positive")
    .optional()
    .default(5),
});

export const updateProductSchema = z.object({
  name: z.string().min(2).optional(),
  sku: z.string().min(2).optional(),
  price: z.coerce.number().min(0).optional(),
  description: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  minStockLevel: z.coerce.number().min(0).optional(),
});

export type CreateProduct = z.infer<typeof createProductSchema>;
export type UpdateProduct = z.infer<typeof updateProductSchema>;

// ── Form schemas (stricter, no coercion) ────────────────────────────

export const productFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  sku: z.string().min(2, "SKU must be at least 2 characters"),
  price: z.number().min(0, "Price must be positive"),
  minStockLevel: z.number().min(0, "Minimum stock must be positive"),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
});

// ── Movement schemas (API + AI tool) ────────────────────────────────

export const createMovementSchema = z.object({
  productId: z.string().describe("The ID of the product being moved"),
  type: z
    .enum(["IN", "OUT", "TRANSFER", "ADJUSTMENT"])
    .describe(
      "The type of movement. IN (restock), OUT (sales/removal), TRANSFER (between warehouses), ADJUSTMENT (stock correction)."
    ),
  quantity: z.coerce
    .number()
    .min(1)
    .describe("The quantity of items moved. Must be positive."),
  fromWarehouseId: aiOptional(z.string()).describe(
    "The source warehouse ID. Required for TRANSFER and OUT movements. Optional for ADJUSTMENT when decreasing stock."
  ),
  toWarehouseId: aiOptional(z.string()).describe(
    "The destination warehouse ID. Required for TRANSFER and IN movements. Optional for ADJUSTMENT when increasing stock."
  ),
  notes: aiOptional(z.string()).describe(
    "Optional notes details about the movement"
  ),
});

export const movementFormSchema = createMovementSchema
  .omit({ productId: true })
  .extend({
    quantity: z.number().min(1, "Quantity must be at least 1"),
  });

export const movementSchema = z.object({
  type: z.enum(["IN", "OUT", "TRANSFER", "ADJUSTMENT"]),
  id: z.string(),
  createdAt: z.string(),
  organizationId: z.string(),
  productId: z.string(),
  quantity: z.number(),
  fromWarehouseId: z.string().nullable(),
  toWarehouseId: z.string().nullable(),
  notes: z.string().nullable(),
});

export type Movement = z.infer<typeof movementSchema>;
export type CreateMovement = z.infer<typeof createMovementSchema>;
