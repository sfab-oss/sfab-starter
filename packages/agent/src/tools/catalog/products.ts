import {
  createProductSchema,
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

// Read-only product tools. They need only `organizationId`, so they can be
// composed for surfaces without an acting user (e.g. a delegated sub-agent).
export const createProductReadTools = (
  ctx: Pick<AgentToolsContext, "organizationId">
) => {
  const orgId = ctx.organizationId;
  return {
    "list-products": tool({
      description: "List all catalog products.",
      inputSchema: z.object({}),
      execute: async () => getProducts(orgId),
    }),
    "get-product": tool({
      description: "Get details of a specific product by ID.",
      inputSchema: z.object({ id: z.string() }),
      execute: async ({ id }) => getProduct(id, orgId),
    }),
  };
};

// Mutating product tools. Every one is RBAC-gated (`assertCan`), so they
// require the full context including the acting `userId`.
export const createProductWriteTools = (ctx: AgentToolsContext) => {
  const orgId = ctx.organizationId;
  return {
    "create-product": tool({
      description: "Create a new catalog product.",
      inputSchema: createProductSchema,
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
      execute: async ({ id, data }) => {
        await assertCan("catalog:write", ctx);
        return updateProduct(id, orgId, data);
      },
    }),
    "delete-product": tool({
      description: "Delete a product.",
      inputSchema: z.object({ id: z.string() }),
      execute: async ({ id }) => {
        await assertCan("catalog:write", ctx);
        return deleteProduct(id, orgId);
      },
    }),
  };
};

export const createProductTools = (ctx: AgentToolsContext) => ({
  ...createProductReadTools(ctx),
  ...createProductWriteTools(ctx),
});
