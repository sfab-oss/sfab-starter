import { DISPLAY_TOOL_NAMES } from "@workspace/agent/constants";
import type { DynamicToolUIPart, ToolUIPart } from "ai";
import type { ComponentType } from "react";
import { MemoryDisplay } from "./memory-display";
import { ProductListDisplay } from "./product-list";
import { WarehouseListDisplay } from "./warehouse-list";

export interface ToolRenderProps {
  part: ToolUIPart | DynamicToolUIPart;
}

export const TOOL_RENDERERS: Record<string, ComponentType<ToolRenderProps>> = {
  [DISPLAY_TOOL_NAMES.PRODUCT_LIST]: ProductListDisplay,
  [DISPLAY_TOOL_NAMES.WAREHOUSE_LIST]: WarehouseListDisplay,
  [DISPLAY_TOOL_NAMES.MEMORY]: MemoryDisplay,
};

export function getToolName(part: ToolUIPart | DynamicToolUIPart): string {
  if ("toolName" in part && typeof part.toolName === "string") {
    return part.toolName;
  }
  if (part.type.startsWith("tool-")) {
    return part.type.slice(5);
  }
  return part.type;
}

export function getDisplayToolRenderer(
  part: ToolUIPart | DynamicToolUIPart
): ComponentType<ToolRenderProps> | undefined {
  return TOOL_RENDERERS[getToolName(part)];
}
