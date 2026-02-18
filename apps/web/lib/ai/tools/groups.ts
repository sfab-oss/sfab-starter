import type { aiToolId } from "./registry";

type ToolGroupKey =
  | "system"
  | "productManagement"
  | "warehouseManagement"
  | "stockMovements"
  | "formManagement";

export const toolIdsGroups: Record<ToolGroupKey, aiToolId[]> = {
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
  formManagement: [
    "read-form-values",
    "update-form-values",
    "validate-form",
    "submit-form",
  ],
};
