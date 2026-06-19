import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod";
import { products } from "../schema/inventory";

export const selectProductSchema = createSelectSchema(products);

export const insertProductSchema = createInsertSchema(products, {
  name: z.string().min(2, "Name must be at least 2 characters"),
  sku: z.string().min(2, "SKU must be at least 2 characters"),
}).omit({ organizationId: true, id: true, createdAt: true, updatedAt: true });

export const updateProductSchema = createUpdateSchema(products, {
  name: z.string().min(2),
  sku: z.string().min(2),
}).omit({ organizationId: true, id: true, createdAt: true, updatedAt: true });

export type SelectProduct = z.infer<typeof selectProductSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type UpdateProduct = z.infer<typeof updateProductSchema>;
