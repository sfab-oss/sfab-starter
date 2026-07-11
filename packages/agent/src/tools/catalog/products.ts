import {
  createProductSchema,
  updateProductSchema,
} from "@workspace/contract/catalog";
import {
  createProduct,
  deleteProduct,
  getProduct,
  getProducts,
  resolveProductRef,
  updateProduct,
} from "@workspace/core/catalog";
import { tool } from "ai";
import { z } from "zod";
import type { AgentToolsContext } from "../../types";
import { assertCan } from "../guard";

const productRefSchema = z
  .string()
  .describe("Product id (ULID), or exact product name, or exact SKU");

export const createProductReadTools = (
  ctx: Pick<AgentToolsContext, "organizationId">
) => {
  const orgId = ctx.organizationId;
  return {
    list_products: tool({
      description: "List all catalog products.",
      inputSchema: z.object({}),
      execute: async () => getProducts(orgId),
    }),
    get_product: tool({
      description: "Get details of a specific product by ID.",
      inputSchema: z.object({ id: z.string() }),
      execute: async ({ id }) => getProduct(id, orgId),
    }),
  };
};

export const createProductWriteTools = (ctx: AgentToolsContext) => {
  const orgId = ctx.organizationId;
  return {
    create_product: tool({
      description: "Create a new catalog product.",
      inputSchema: createProductSchema,
      execute: async (input) => {
        await assertCan("catalog:write", ctx);
        const result = await createProduct({ ...input, orgId });
        return result[0];
      },
    }),
    update_product: tool({
      description: "Update an existing product.",
      inputSchema: z.object({
        id: productRefSchema,
        data: updateProductSchema,
      }),
      execute: async ({ id, data }) => {
        await assertCan("catalog:write", ctx);
        const product = await resolveProductRef(orgId, id);
        return updateProduct(product.id, orgId, data);
      },
    }),
  };
};

/** Destructive writes — `needsApproval` pauses mid-codemode. */
export const createProductApprovalTools = (ctx: AgentToolsContext) => {
  const orgId = ctx.organizationId;
  return {
    delete_product: tool({
      description: "Delete a product. Requires explicit user approval.",
      inputSchema: z.object({ id: productRefSchema }),
      needsApproval: true,
      execute: async ({ id }) => {
        await assertCan("catalog:write", ctx);
        const product = await resolveProductRef(orgId, id);
        return deleteProduct(product.id, orgId);
      },
    }),
  };
};

export const createProductTools = (ctx: AgentToolsContext) => ({
  ...createProductReadTools(ctx),
  ...createProductWriteTools(ctx),
  ...createProductApprovalTools(ctx),
});
