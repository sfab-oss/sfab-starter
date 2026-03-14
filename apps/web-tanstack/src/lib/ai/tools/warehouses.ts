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
  warehouseListSchema,
  warehouseSchema,
} from "@workspace/types/warehouses";
import { tool } from "ai";
import { z } from "zod";

export const createWarehouseTools = (orgId: string) => {
  return {
    "list-warehouses": tool({
      description: "List all warehouses.",
      inputSchema: z.object({}),
      outputSchema: warehouseListSchema,
      execute: async () => {
        return await getWarehouses(orgId);
      },
    }),
    "get-warehouse": tool({
      description: "Get details of a specific warehouse by ID.",
      inputSchema: z.object({ id: z.string() }),
      outputSchema: warehouseSchema,
      execute: async ({ id }) => {
        return await getWarehouse(id, orgId);
      },
    }),
    "create-warehouse": tool({
      description: "Create a new warehouse.",
      inputSchema: createWarehouseSchema,
      outputSchema: warehouseSchema,
      execute: async (input) => {
        const result = await createWarehouse({
          ...input,
          orgId,
        });
        if (!result) {
          throw new Error("Failed to create warehouse");
        }
        return result;
      },
      needsApproval: true,
    }),
    "update-warehouse": tool({
      description: "Update an existing warehouse.",
      inputSchema: z.object({
        id: z.string(),
        data: updateWarehouseSchema,
      }),
      outputSchema: warehouseSchema,
      execute: async ({ id, data }) => {
        const result = await updateWarehouse(id, orgId, data);
        return result;
      },
      needsApproval: true,
    }),
    "delete-warehouse": tool({
      description: "Delete a warehouse.",
      inputSchema: z.object({ id: z.string() }),
      outputSchema: z.any(),
      execute: async ({ id }) => {
        return await deleteWarehouse(id, orgId);
      },
      needsApproval: true,
    }),
  };
};
