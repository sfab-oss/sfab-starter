import { zValidator } from "@hono/zod-validator";
import {
  createWarehouse,
  deleteWarehouse,
  getWarehouse,
  getWarehouses,
  updateWarehouse,
} from "@workspace/core/warehouses";
import {
  createWarehouseSchema,
  updateWarehouseSchema,
} from "@workspace/types/warehouses";
import { Hono } from "hono";
import { z } from "zod";
import type { HonoContextWithAuthAndOrg } from "../../types";

const warehouseIdSchema = z.object({
  id: z.string(),
});

const warehousesRoute = new Hono<HonoContextWithAuthAndOrg>()
  .get("/", async (c) => {
    const userId = c.get("user").id;
    const data = await getWarehouses(userId);
    return c.json(data);
  })
  .get("/:id", zValidator("param", warehouseIdSchema), async (c) => {
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
    zValidator("param", warehouseIdSchema),
    zValidator("json", updateWarehouseSchema),
    async (c) => {
      const userId = c.get("user").id;
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const result = await updateWarehouse(id, userId, body);
      return c.json(result);
    }
  )
  .delete("/:id", zValidator("param", warehouseIdSchema), async (c) => {
    const userId = c.get("user").id;
    const { id } = c.req.valid("param");
    const result = await deleteWarehouse(id, userId);
    return c.json(result);
  });

export default warehousesRoute;
