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
import { z } from "zod";
import { assertCan } from "../../tools/guard";
import { requireFound } from "../../tools/tool-result";
import type { ToolContext } from "../context";

const productRefSchema = z
  .string()
  .describe("Product id (ULID), or exact product name, or exact SKU");

export const listProductsName = "list_products";

export const listProductsDescription = "List all catalog products.";

export const listProductsInputSchema = z.object({});

export async function listProductsExecute(
  ctx: ToolContext,
  _input: z.infer<typeof listProductsInputSchema>
): Promise<unknown> {
  return await getProducts(ctx.organizationId);
}

export const getProductName = "get_product";

export const getProductDescription = "Get details of a specific product by ID.";

export const getProductInputSchema = z.object({ id: z.string() });

export async function getProductExecute(
  ctx: ToolContext,
  input: z.infer<typeof getProductInputSchema>
): Promise<unknown> {
  return requireFound(
    await getProduct(input.id, ctx.organizationId),
    `Product not found: ${input.id}`
  );
}

export const createProductName = "create_product";

export const createProductDescription = "Create a new catalog product.";

export const createProductInputSchema = createProductSchema;

export async function createProductExecute(
  ctx: ToolContext,
  input: z.infer<typeof createProductInputSchema>
): Promise<unknown> {
  await assertCan("catalog:write", ctx);
  const result = await createProduct({ ...input, orgId: ctx.organizationId });
  return result[0];
}

export const updateProductName = "update_product";

export const updateProductDescription = "Update an existing product.";

export const updateProductInputSchema = z.object({
  id: productRefSchema,
  data: updateProductSchema,
});

export async function updateProductExecute(
  ctx: ToolContext,
  input: z.infer<typeof updateProductInputSchema>
): Promise<unknown> {
  await assertCan("catalog:write", ctx);
  const product = await resolveProductRef(ctx.organizationId, input.id);
  return updateProduct(product.id, ctx.organizationId, input.data);
}

export const deleteProductName = "delete_product";

export const deleteProductDescription =
  "Delete a product. Requires explicit user approval.";

export const deleteProductInputSchema = z.object({ id: productRefSchema });

export async function deleteProductExecute(
  ctx: ToolContext,
  input: z.infer<typeof deleteProductInputSchema>
): Promise<unknown> {
  await assertCan("catalog:write", ctx);
  const product = await resolveProductRef(ctx.organizationId, input.id);
  return deleteProduct(product.id, ctx.organizationId);
}
