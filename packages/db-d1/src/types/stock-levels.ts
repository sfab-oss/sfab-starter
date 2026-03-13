import { createSelectSchema } from "drizzle-zod";
import type { z } from "zod";
import { stockLevels } from "../schema/inventory";

export const selectStockLevelSchema = createSelectSchema(stockLevels);

export type SelectStockLevel = z.infer<typeof selectStockLevelSchema>;
