import {
  createProductSchema,
  productSchema,
  productsListSchema,
  updateProductSchema,
} from "@workspace/contract/catalog";
import {
  createProduct,
  deleteProduct,
  getProduct,
  getProducts,
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
      description: "List all catalog products.",
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
      description: "Create a new catalog product.",
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
