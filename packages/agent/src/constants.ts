/** Display tool names — keep in sync with `tools/display.ts` and UI `tool-registry.tsx`. */
export const DISPLAY_TOOL_NAMES = {
  PRODUCT_LIST: "display-product-list",
  WAREHOUSE_LIST: "display-warehouse-list",
  MEMORY: "display-memory",
} as const;

export type DisplayToolName =
  (typeof DISPLAY_TOOL_NAMES)[keyof typeof DISPLAY_TOOL_NAMES];
