import type { AiToolId } from "./index";

type ToolGroupKey =
  | "system"
  | "productManagement"
  | "warehouseManagement"
  | "stockMovements"
  | "agentManagement";

export const toolIdsGroups: Record<ToolGroupKey, AiToolId[]> = {
  system: ["load-skill"],
  agentManagement: ["run-agent", "get-task-result", "list-tasks"],
  productManagement: [
    "list-products",
    "get-product",
    "create-product",
    "update-product",
    "delete-product",
  ],
  warehouseManagement: [
    "list-warehouses",
    "get-warehouse",
    "create-warehouse",
    "update-warehouse",
    "delete-warehouse",
  ],
  stockMovements: ["create-movement", "list-products", "list-warehouses"],
};
