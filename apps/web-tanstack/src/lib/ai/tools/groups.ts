import type { AiToolId } from "./index";

type ToolGroupKey =
  | "system"
  | "productManagement"
  | "warehouseManagement"
  | "stockMovements";

export const toolIdsGroups: Record<ToolGroupKey, AiToolId[]> = {
  system: ["load-skill"],
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
