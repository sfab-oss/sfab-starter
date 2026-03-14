import { zValidator } from "@hono/zod-validator";
import {
  createProduct,
  deleteProduct,
  getPaginatedProducts,
  getProduct,
  getProductMovements,
  updateProduct,
} from "@workspace/core/products";
import { paginationQuerySchema } from "@workspace/types/pagination";
import {
  createProductSchema,
  updateProductSchema,
} from "@workspace/types/products";
import { Hono } from "hono";
import { z } from "zod";
import type { HonoContextWithAuthAndOrg } from "../../types";

const productIdSchema = z.object({
  id: z.string(),
});

const productsRoute = new Hono<HonoContextWithAuthAndOrg>()
  .get("/", zValidator("query", paginationQuerySchema), async (c) => {
    const userId = c.get("user").id;
    const params = c.req.valid("query");
    const data = await getPaginatedProducts(userId, params);
    return c.json(data);
  })
  .get("/:id", zValidator("param", productIdSchema), async (c) => {
    const userId = c.get("user").id;
    const { id } = c.req.valid("param");
    const data = await getProduct(id, userId);
    if (!data) {
      return c.json({ error: "Product not found" }, 404);
    }
    return c.json(data);
  })
  .get("/:id/movements", zValidator("param", productIdSchema), async (c) => {
    const userId = c.get("user").id;
    const { id } = c.req.valid("param");
    const data = await getProductMovements(id, userId);
    return c.json(data);
  })
  .post("/", zValidator("json", createProductSchema), async (c) => {
    const userId = c.get("user").id;
    const body = c.req.valid("json");
    const result = await createProduct({ ...body, userId });
    return c.json(result[0]);
  })
  .put(
    "/:id",
    zValidator("param", productIdSchema),
    zValidator("json", updateProductSchema),
    async (c) => {
      const userId = c.get("user").id;
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const result = await updateProduct(id, userId, body);
      return c.json(result);
    }
  )
  .delete("/:id", zValidator("param", productIdSchema), async (c) => {
    const userId = c.get("user").id;
    const { id } = c.req.valid("param");
    const result = await deleteProduct(id, userId);
    return c.json(result);
  });

export default productsRoute;
