import type { InferUITools } from "ai";
//import { createExcelTools } from "./(registry)/excel";
import { createFormTools } from "./(registry)/form-tools";
import { loadSkillTool } from "./(registry)/load-skill";
import { createProductTools } from "./(registry)/products";
import { showMessageTool } from "./(registry)/show-message";
import { createWarehouseTools } from "./(registry)/warehouses";

export const getAiTools = (userId: string) => {
  return {
    "load-skill": loadSkillTool,
    "show-message": showMessageTool,
    ...createProductTools(userId),
    ...createWarehouseTools(userId),
    ...createFormTools(),
  };
};

export type AITools = InferUITools<ReturnType<typeof getAiTools>>;
export type aiToolId = keyof ReturnType<typeof getAiTools>;
