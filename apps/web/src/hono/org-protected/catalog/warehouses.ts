import { zValidator } from "@hono/zod-validator";
import {
  createWarehouseSchema,
  updateWarehouseSchema,
} from "@workspace/contract/catalog";
import { paginationQuerySchema } from "@workspace/contract/pagination";
import {
  createWarehouse,
  deleteWarehouse,
  getPaginatedWarehouses,
  getWarehouse,
  updateWarehouse,
} from "@workspace/core/catalog";
import { Hono } from "hono";
import { z } from "zod";
import type { HonoContextWithAuthAndOrg } from "../../types";

const warehouseIdSchema = z.object({
  id: z.string(),
});

const warehousesRoute = new Hono<HonoContextWithAuthAndOrg>()
  .get("/", zValidator("query", paginationQuerySchema), async (c) => {
    const orgId = c.get("session").activeOrganizationId;
    const params = c.req.valid("query");
    const data = await getPaginatedWarehouses(orgId, params);
    return c.json(data);
  })
  .get("/:id", zValidator("param", warehouseIdSchema), async (c) => {
    const orgId = c.get("session").activeOrganizationId;
    const { id } = c.req.valid("param");
    const data = await getWarehouse(id, orgId);
    if (!data) {
      return c.json({ error: "Warehouse not found" }, 404);
    }
    return c.json(data);
  })
  .post("/", zValidator("json", createWarehouseSchema), async (c) => {
    const orgId = c.get("session").activeOrganizationId;
    const body = c.req.valid("json");
    const result = await createWarehouse({ ...body, orgId });
    return c.json(result);
  })
  .put(
    "/:id",
    zValidator("param", warehouseIdSchema),
    zValidator("json", updateWarehouseSchema),
    async (c) => {
      const orgId = c.get("session").activeOrganizationId;
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const result = await updateWarehouse(id, orgId, body);
      return c.json(result);
    }
  )
  .delete("/:id", zValidator("param", warehouseIdSchema), async (c) => {
    const orgId = c.get("session").activeOrganizationId;
    const { id } = c.req.valid("param");
    const result = await deleteWarehouse(id, orgId);
    return c.json(result);
  });

export default warehousesRoute;
