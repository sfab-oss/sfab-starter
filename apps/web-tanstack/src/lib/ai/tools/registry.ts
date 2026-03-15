import type { InferUITools } from "ai";
import { loadSkillTool } from "./load-skill";
import { createProductTools } from "./products";
import { showMessageTool } from "./show-message";
import { wrapToolsWithTruncation } from "./truncation";
import { createWarehouseTools } from "./warehouses";

export const getAiTools = (orgId: string) => {
  const rawTools = {
    "load-skill": loadSkillTool,
    "show-message": showMessageTool,
    ...createProductTools(orgId),
    ...createWarehouseTools(orgId),
  };
  return wrapToolsWithTruncation(rawTools);
};

export type AITools = InferUITools<ReturnType<typeof getAiTools>>;
export type AiToolId = keyof ReturnType<typeof getAiTools>;
