import {
  createWarehouseSchema,
  updateWarehouseSchema,
  warehouseListSchema,
  warehouseSchema,
} from "@workspace/contract/catalog";
import {
  createWarehouse,
  deleteWarehouse,
  getWarehouse,
  getWarehouses,
  updateWarehouse,
} from "@workspace/core/catalog";
import { tool } from "ai";
import { z } from "zod";
import type { AgentToolsContext } from "../../types";
import { assertCan } from "../guard";

export const createWarehouseTools = (ctx: AgentToolsContext) => {
  const orgId = ctx.organizationId;
  return {
    "list-warehouses": tool({
      description: "List all warehouses.",
      inputSchema: z.object({}),
      outputSchema: warehouseListSchema,
      execute: async () => getWarehouses(orgId),
    }),
    "get-warehouse": tool({
      description: "Get details of a specific warehouse by ID.",
      inputSchema: z.object({ id: z.string() }),
      outputSchema: warehouseSchema,
      execute: async ({ id }) => getWarehouse(id, orgId),
    }),
    "create-warehouse": tool({
      description: "Create a new warehouse.",
      inputSchema: createWarehouseSchema,
      outputSchema: warehouseSchema,
      execute: async (input) => {
        await assertCan("catalog:write", ctx);
        const result = await createWarehouse({ ...input, orgId });
        if (!result) {
          throw new Error("Failed to create warehouse");
        }
        return result;
      },
    }),
    "update-warehouse": tool({
      description: "Update an existing warehouse.",
      inputSchema: z.object({
        id: z.string(),
        data: updateWarehouseSchema,
      }),
      outputSchema: warehouseSchema,
      execute: async ({ id, data }) => {
        await assertCan("catalog:write", ctx);
        return updateWarehouse(id, orgId, data);
      },
    }),
    "delete-warehouse": tool({
      description: "Delete a warehouse.",
      inputSchema: z.object({ id: z.string() }),
      outputSchema: z.any(),
      execute: async ({ id }) => {
        await assertCan("catalog:write", ctx);
        return deleteWarehouse(id, orgId);
      },
    }),
  };
};
