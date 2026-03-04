import {
  createProduct,
  deleteProduct,
  getProduct,
  getProducts,
  performStockMovement,
  updateProduct,
} from "@workspace/db-d1/services/products";
import {
  createMovementSchema,
  createProductSchema,
  movementSchema,
  productSchema,
  productsListSchema,
  updateProductSchema,
} from "@workspace/types/products";
import { tool } from "ai";
import { z } from "zod";

export const createProductTools = (userId: string) => {
  return {
    "list-products": tool({
      description: "List all inventory products with their stock levels.",
      inputSchema: z.object({}),
      outputSchema: productsListSchema,
      execute: async () => {
        return await getProducts(userId);
      },
    }),
    "get-product": tool({
      description: "Get details of a specific product by ID.",
      inputSchema: z.object({ id: z.string() }),
      outputSchema: productSchema,
      execute: async ({ id }) => {
        return await getProduct(id, userId);
      },
    }),
    "create-product": tool({
      description: "Create a new inventory product.",
      inputSchema: createProductSchema,
      outputSchema: productSchema,
      execute: async (input) => {
        const result = await createProduct({
          ...input,
          userId,
        });
        return result[0];
      },
      needsApproval: true,
    }),
    "update-product": tool({
      description: "Update an existing product.",
      inputSchema: z.object({
        id: z.string(),
        data: updateProductSchema,
      }),
      outputSchema: productSchema,
      execute: async ({ id, data }) => {
        const result = await updateProduct(id, userId, data);
        return result;
      },
      needsApproval: true,
    }),
    // biome-ignore lint/suspicious/noExplicitAny: Needed for AI SDK type compatibility
    "create-movement": tool<any, any>({
      description: "Record a stock movement (restock, adjust, transfer).",
      inputSchema: createMovementSchema,
      outputSchema: movementSchema,
      execute: async (input) => {
        const result = await performStockMovement({
          ...input,
          userId,
        });
        return result;
      },
      needsApproval: true,
    }),
    "delete-product": tool({
      description: "Delete a product.",
      inputSchema: z.object({ id: z.string() }),
      outputSchema: z.any(),
      execute: async ({ id }) => {
        return await deleteProduct(id, userId);
      },
      needsApproval: true,
    }),
  };
};
