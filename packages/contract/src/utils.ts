import type { z } from "zod";

/** Nullable instead of optional — AI tool inputs handle explicit null more reliably. */
export const aiOptional = <T extends z.ZodTypeAny>(schema: T) => {
  return schema.nullable();
};
