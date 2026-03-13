import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import type { z } from "zod";
import { movements } from "../schema/inventory";

export const selectMovementSchema = createSelectSchema(movements);

export const insertMovementSchema = createInsertSchema(movements).omit({
  userId: true,
  id: true,
  createdAt: true,
});

export type SelectMovement = z.infer<typeof selectMovementSchema>;
export type InsertMovement = z.infer<typeof insertMovementSchema>;
