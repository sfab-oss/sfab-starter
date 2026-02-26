import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { extractAuth, requireAuth } from "../middleware/auth";
import type { HonoContextWithAuth } from "../types";

const mockProducts = [
  {
    id: "1",
    userId: "user1",
    sku: "SKU-001",
    name: "Widget A",
    description: "A high-quality widget",
    price: "29.99",
    cost: "15.00",
    minStockLevel: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    userId: "user1",
    sku: "SKU-002",
    name: "Gadget B",
    description: "An amazing gadget",
    price: "49.99",
    cost: "25.00",
    minStockLevel: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "3",
    userId: "user1",
    sku: "SKU-003",
    name: "Thingamajig C",
    description: "The best thingamajig",
    price: "19.99",
    cost: "8.00",
    minStockLevel: 20,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockWarehouses = [
  {
    id: "1",
    userId: "user1",
    name: "Main Warehouse",
    location: "New York, NY",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    userId: "user1",
    name: "West Coast Hub",
    location: "Los Angeles, CA",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const productIdSchema = z.object({
  id: z.string(),
});

const createProductSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.string().optional(),
  cost: z.string().optional(),
  minStockLevel: z.number().optional(),
  imageUrl: z.string().optional(),
});

const updateProductSchema = createProductSchema.partial();

const createWarehouseSchema = z.object({
  name: z.string().min(1),
  location: z.string().optional(),
});

const updateWarehouseSchema = createWarehouseSchema.partial();

const productsRoute = new Hono<HonoContextWithAuth>()
  .get("/", (c) => {
    return c.json({ products: mockProducts });
  })
  .get("/:id", zValidator("param", productIdSchema), (c) => {
    const { id } = c.req.valid("param");
    const product = mockProducts.find((p) => p.id === id);
    if (!product) {
      return c.json({ error: "Product not found" }, 404);
    }
    return c.json({ product });
  })
  .post("/", zValidator("json", createProductSchema), (c) => {
    return c.json({ product: { id: "new", ...mockProducts[0] } }, 201);
  })
  .put(
    "/:id",
    zValidator("param", productIdSchema),
    zValidator("json", updateProductSchema),
    (c) => {
      return c.json({ success: true });
    }
  )
  .delete("/:id", zValidator("param", productIdSchema), (c) => {
    return c.json({ success: true });
  });

const warehousesRoute = new Hono<HonoContextWithAuth>()
  .get("/", (c) => {
    return c.json({ warehouses: mockWarehouses });
  })
  .get("/:id", zValidator("param", productIdSchema), (c) => {
    const { id } = c.req.valid("param");
    const warehouse = mockWarehouses.find((w) => w.id === id);
    if (!warehouse) {
      return c.json({ error: "Warehouse not found" }, 404);
    }
    return c.json({ warehouse });
  })
  .post("/", zValidator("json", createWarehouseSchema), (c) => {
    return c.json({ warehouse: { id: "new", ...mockWarehouses[0] } }, 201);
  })
  .put(
    "/:id",
    zValidator("param", productIdSchema),
    zValidator("json", updateWarehouseSchema),
    (c) => {
      return c.json({ success: true });
    }
  )
  .delete("/:id", zValidator("param", productIdSchema), (c) => {
    return c.json({ success: true });
  });

export const inventoryRoutes = new Hono()
  .use("*", extractAuth)
  .use("*", requireAuth)
  .route("/products", productsRoute)
  .route("/warehouses", warehousesRoute);
