import type { z } from "zod";

export const aiOptional = <T extends z.ZodTypeAny>(schema: T) => {
  return schema.nullable();
};
