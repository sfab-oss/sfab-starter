import type { ToolSet } from "ai";
import type { AgentToolsContext } from "../types";
import { createDisplayTools } from "./display";
import { createProductTools } from "./products";
import { createWarehouseTools } from "./warehouses";

export const getOrgAgentTools = (ctx: AgentToolsContext): ToolSet => ({
  ...createProductTools(ctx.organizationId),
  ...createWarehouseTools(ctx.organizationId),
});

export const getOrgAgentDisplayTools = (ctx: AgentToolsContext): ToolSet =>
  createDisplayTools(ctx);
