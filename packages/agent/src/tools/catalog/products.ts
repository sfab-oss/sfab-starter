import {
  createMovementSchema,
  createProductSchema,
  movementSchema,
  productSchema,
  productsListSchema,
  updateProductSchema,
} from "@workspace/contract/catalog";
import {
  createProduct,
  deleteProduct,
  getProduct,
  getProducts,
  performStockMovement,
  updateProduct,
} from "@workspace/core/catalog";
import { tool } from "ai";
import { z } from "zod";
import type { AgentToolsContext } from "../../types";
import { assertCan } from "../guard";

export const createProductTools = (ctx: AgentToolsContext) => {
  const orgId = ctx.organizationId;
  return {
    "list-products": tool({
      description: "List all inventory products with their stock levels.",
      inputSchema: z.object({}),
      outputSchema: productsListSchema,
      execute: async () => getProducts(orgId),
    }),
    "get-product": tool({
      description: "Get details of a specific product by ID.",
      inputSchema: z.object({ id: z.string() }),
      outputSchema: productSchema,
      execute: async ({ id }) => getProduct(id, orgId),
    }),
    "create-product": tool({
      description: "Create a new inventory product.",
      inputSchema: createProductSchema,
      outputSchema: productSchema,
      execute: async (input) => {
        await assertCan("catalog:write", ctx);
        const result = await createProduct({ ...input, orgId });
        return result[0];
      },
    }),
    "update-product": tool({
      description: "Update an existing product.",
      inputSchema: z.object({
        id: z.string(),
        data: updateProductSchema,
      }),
      outputSchema: productSchema,
      execute: async ({ id, data }) => {
        await assertCan("catalog:write", ctx);
        return updateProduct(id, orgId, data);
      },
    }),
    // biome-ignore lint/suspicious/noExplicitAny: AI SDK type compatibility
    "create-movement": tool<any, any>({
      description: "Record a stock movement (restock, adjust, transfer).",
      inputSchema: createMovementSchema,
      outputSchema: movementSchema,
      execute: async (input) => {
        await assertCan("catalog:write", ctx);
        return performStockMovement({
          ...input,
          orgId,
        });
      },
    }),
    "delete-product": tool({
      description: "Delete a product.",
      inputSchema: z.object({ id: z.string() }),
      outputSchema: z.any(),
      execute: async ({ id }) => {
        await assertCan("catalog:write", ctx);
        return deleteProduct(id, orgId);
      },
    }),
  };
};
