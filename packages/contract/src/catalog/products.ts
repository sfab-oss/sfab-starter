import { z } from "zod";

const selectProductSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  sku: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number().int().nullable(),
  cost: z.number().int().nullable(),
  minStockLevel: z.number().nullable(),
  imageUrl: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const productSchema = selectProductSchema;

export type Product = z.infer<typeof productSchema>;

export const productsListSchema = z.array(productSchema);

export const createProductSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  sku: z.string().min(2, "SKU must be at least 2 characters"),
  price: z.coerce.number().int().min(0, "Price must be positive").optional(),
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
  price: z.coerce.number().int().min(0).optional(),
  description: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  minStockLevel: z.coerce.number().min(0).optional(),
});

export type CreateProduct = z.infer<typeof createProductSchema>;
export type UpdateProduct = z.infer<typeof updateProductSchema>;

// Form schema: price stays in major units (what the user types); the UI converts
// major -> minor at the submit boundary (@workspace/ui/lib/money).
export const productFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  sku: z.string().min(2, "SKU must be at least 2 characters"),
  price: z.number().min(0, "Price must be positive"),
  minStockLevel: z.number().min(0, "Minimum stock must be positive"),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
});
