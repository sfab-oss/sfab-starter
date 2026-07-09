import { DISPLAY_TOOL_NAMES } from "@workspace/agent/constants";
import type { DynamicToolUIPart, ToolUIPart } from "ai";
import type { ComponentType } from "react";
import { DelegateRun } from "./delegate-run";
import { MemoryDisplay } from "./memory-display";
import { PausedExecutionCard } from "./paused-execution-card";
import { ProductListDisplay } from "./product-list";

export interface ToolRenderProps {
  part: ToolUIPart | DynamicToolUIPart;
}

export const TOOL_RENDERERS: Record<string, ComponentType<ToolRenderProps>> = {
  [DISPLAY_TOOL_NAMES.PRODUCT_LIST]: ProductListDisplay,
  [DISPLAY_TOOL_NAMES.MEMORY]: MemoryDisplay,
};

/** Renderers that own the tool in every state (not only completed output). */
export const LIVE_TOOL_RENDERERS: Record<
  string,
  ComponentType<ToolRenderProps>
> = {
  delegate: DelegateRun,
  codemode: PausedExecutionCard,
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

export function getLiveToolRenderer(
  part: ToolUIPart | DynamicToolUIPart
): ComponentType<ToolRenderProps> | undefined {
  return LIVE_TOOL_RENDERERS[getToolName(part)];
}
