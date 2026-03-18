import type { InferUITools } from "ai";
import { wrapToolsWithTruncation } from "../utils/truncation";
import { loadSkillTool } from "./load-skill";
import { createProductTools } from "./products";
import { showMessageTool } from "./show-message";
import { createSubAgentTools, type SubAgentToolContext } from "./sub-agent";
import { createWarehouseTools } from "./warehouses";

/** Base tools without sub-agent management — used by sub-agents themselves. */
export const getBaseAiTools = (orgId: string) => {
  const rawTools = {
    "load-skill": loadSkillTool,
    "show-message": showMessageTool,
    ...createProductTools(orgId),
    ...createWarehouseTools(orgId),
  };
  return wrapToolsWithTruncation(rawTools);
};

/** Full tools with sub-agent management — used by the main agent. */
export const getAiTools = (context: SubAgentToolContext) => {
  const rawTools = {
    "load-skill": loadSkillTool,
    "show-message": showMessageTool,
    ...createProductTools(context.orgId),
    ...createWarehouseTools(context.orgId),
    ...createSubAgentTools(context),
  };
  return wrapToolsWithTruncation(rawTools);
};

export type AITools = InferUITools<ReturnType<typeof getAiTools>>;
export type AiToolId = keyof ReturnType<typeof getAiTools>;
