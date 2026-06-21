import type { ToolSet } from "ai";
import type { AgentToolsContext } from "../types";
import { createProductTools, createWarehouseTools } from "./catalog";
import { createDisplayTools } from "./display";

export const getOrgAgentTools = (ctx: AgentToolsContext): ToolSet => ({
  ...createProductTools(ctx),
  ...createWarehouseTools(ctx),
});

export const getOrgAgentDisplayTools = (ctx: AgentToolsContext): ToolSet =>
  createDisplayTools(ctx);
