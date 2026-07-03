import { zValidator } from "@hono/zod-validator";
import {
  createProductSchema,
  updateProductSchema,
} from "@workspace/contract/catalog";
import { paginationQuerySchema } from "@workspace/contract/pagination";
import {
  createProduct,
  deleteProduct,
  getPaginatedProducts,
  getProduct,
  updateProduct,
} from "@workspace/core/catalog";
import { Hono } from "hono";
import { z } from "zod";
import { requirePermission } from "../../middleware/auth";
import type { HonoContextWithAuthAndOrg } from "../../types";

const productIdSchema = z.object({
  id: z.string(),
});

const productsRoute = new Hono<HonoContextWithAuthAndOrg>()
  .get("/", zValidator("query", paginationQuerySchema), async (c) => {
    const orgId = c.get("session").activeOrganizationId;
    const params = c.req.valid("query");
    const data = await getPaginatedProducts(orgId, params);
    return c.json(data);
  })
  .get("/:id", zValidator("param", productIdSchema), async (c) => {
    const orgId = c.get("session").activeOrganizationId;
    const { id } = c.req.valid("param");
    const data = await getProduct(id, orgId);
    if (!data) {
      return c.json({ error: "Product not found" }, 404);
    }
    return c.json(data);
  })
  .post(
    "/",
    requirePermission("catalog:write"),
    zValidator("json", createProductSchema),
    async (c) => {
      const orgId = c.get("session").activeOrganizationId;
      const body = c.req.valid("json");
      const result = await createProduct({ ...body, orgId });
      return c.json(result[0]);
    }
  )
  .put(
    "/:id",
    requirePermission("catalog:write"),
    zValidator("param", productIdSchema),
    zValidator("json", updateProductSchema),
    async (c) => {
      const orgId = c.get("session").activeOrganizationId;
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const result = await updateProduct(id, orgId, body);
      return c.json(result);
    }
  )
  .delete(
    "/:id",
    requirePermission("catalog:write"),
    zValidator("param", productIdSchema),
    async (c) => {
      const orgId = c.get("session").activeOrganizationId;
      const { id } = c.req.valid("param");
      const result = await deleteProduct(id, orgId);
      return c.json(result);
    }
  );

export default productsRoute;
