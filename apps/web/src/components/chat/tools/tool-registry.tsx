import { DISPLAY_TOOL_NAMES } from "@workspace/agent/constants";
import type { DynamicToolUIPart, ToolUIPart } from "ai";
import type { ComponentType } from "react";
import { DelegateRun } from "./delegate-run";
import { MemoryDisplay } from "./memory-display";
import { ProductListDisplay } from "./product-list";

export interface ToolRenderProps {
  part: ToolUIPart | DynamicToolUIPart;
}

export const TOOL_RENDERERS: Record<string, ComponentType<ToolRenderProps>> = {
  [DISPLAY_TOOL_NAMES.PRODUCT_LIST]: ProductListDisplay,
  [DISPLAY_TOOL_NAMES.MEMORY]: MemoryDisplay,
};

/**
 * Renderers that must run in *every* tool state, not only once output is
 * available. A sub-agent's whole value is watching it work, so `delegate` draws
 * its own live card the moment the tool call appears (see `DelegateRun`); the
 * `TOOL_RENDERERS` above only replace a *completed* tool's output. (ALW-401)
 */
export const LIVE_TOOL_RENDERERS: Record<
  string,
  ComponentType<ToolRenderProps>
> = {
  delegate: DelegateRun,
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
