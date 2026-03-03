import { zValidator } from "@hono/zod-validator";
import {
  createProduct,
  deleteProduct,
  getDashboardMetrics,
  getProduct,
  getProductMovements,
  getProducts,
  performStockMovement,
  updateProduct,
} from "@workspace/db-d1/services/products";
import { searchInventory } from "@workspace/db-d1/services/search";
import {
  createWarehouse,
  deleteWarehouse,
  getWarehouse,
  getWarehouses,
  updateWarehouse,
} from "@workspace/db-d1/services/warehouses";
import {
  createMovementSchema,
  createProductSchema,
  updateProductSchema,
} from "@workspace/types/products";
import {
  createWarehouseSchema,
  updateWarehouseSchema,
} from "@workspace/types/warehouses";
import { Hono } from "hono";
import { z } from "zod";
import { extractAuth, requireAuth } from "../middleware/auth";
import type { HonoContextWithAuth } from "../types";

const productIdSchema = z.object({
  id: z.string(),
});

const productsRoute = new Hono<HonoContextWithAuth>()
  .get("/", async (c) => {
    const userId = c.get("user").id;
    const data = await getProducts(userId);
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

const warehousesRoute = new Hono<HonoContextWithAuth>()
  .get("/", async (c) => {
    const userId = c.get("user").id;
    const data = await getWarehouses(userId);
    return c.json(data);
  })
  .get("/:id", zValidator("param", productIdSchema), async (c) => {
    const userId = c.get("user").id;
    const { id } = c.req.valid("param");
    const data = await getWarehouse(id, userId);
    if (!data) {
      return c.json({ error: "Warehouse not found" }, 404);
    }
    return c.json(data);
  })
  .post("/", zValidator("json", createWarehouseSchema), async (c) => {
    const userId = c.get("user").id;
    const body = c.req.valid("json");
    const result = await createWarehouse({ ...body, userId });
    return c.json(result);
  })
  .put(
    "/:id",
    zValidator("param", productIdSchema),
    zValidator("json", updateWarehouseSchema),
    async (c) => {
      const userId = c.get("user").id;
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const result = await updateWarehouse(id, userId, body);
      return c.json(result);
    }
  )
  .delete("/:id", zValidator("param", productIdSchema), async (c) => {
    const userId = c.get("user").id;
    const { id } = c.req.valid("param");
    const result = await deleteWarehouse(id, userId);
    return c.json(result);
  });

const searchRoute = new Hono<HonoContextWithAuth>().get("/", async (c) => {
  const userId = c.get("user").id;
  const query = c.req.query("q") || "";

  if (!query) {
    return c.json({ results: [] });
  }

  try {
    const results = await searchInventory(userId, query);
    return c.json({ results });
  } catch (e) {
    console.error("Search error:", e);
    return c.json({ error: "Failed to perform search" }, 500);
  }
});

const metricsRoute = new Hono<HonoContextWithAuth>().get("/", async (c) => {
  const userId = c.get("user").id;
  const data = await getDashboardMetrics(userId);
  return c.json(data);
});

const movementsRoute = new Hono<HonoContextWithAuth>().post(
  "/",
  zValidator("json", createMovementSchema),
  async (c) => {
    const userId = c.get("user").id;
    const body = c.req.valid("json");
    await performStockMovement({ ...body, userId });
    return c.json({ success: true });
  }
);

export const inventoryRoutes = new Hono()
  .use("*", extractAuth)
  .use("*", requireAuth)
  .route("/products", productsRoute)
  .route("/warehouses", warehousesRoute)
  .route("/search", searchRoute)
  .route("/metrics", metricsRoute)
  .route("/movements", movementsRoute);
