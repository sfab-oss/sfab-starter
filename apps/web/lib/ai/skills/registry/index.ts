import type { SkillDefinition } from "@workspace/types/ai";
import { formManagerSkill } from "./form-manager";
import { productManagerSkill } from "./product-manager";
import { stockMovementManagerSkill } from "./stock-movement-manager";
import { warehouseManagerSkill } from "./warehouse-manager";

export const skillDefinitions: Record<string, SkillDefinition> = {
  "product-manager": productManagerSkill,
  "warehouse-manager": warehouseManagerSkill,
  "stock-movement-manager": stockMovementManagerSkill,
  "form-manager": formManagerSkill,
};
