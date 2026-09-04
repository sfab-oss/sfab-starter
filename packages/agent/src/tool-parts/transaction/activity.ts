import { listActivity } from "@workspace/core/activity";
import { z } from "zod";
import type { ToolContext } from "../context";

export const listActivityName = "list_activity";

export const listActivityDescription =
  "List the org's recent activity/event timeline (document finalize and payment events), newest first. Optionally filter by entity.";

export const listActivityInputSchema = z.object({
  entityType: z
    .string()
    .optional()
    .describe("Filter to one entity type (e.g. 'document', 'entity')."),
  entityId: z
    .string()
    .optional()
    .describe("Filter to activity for a single entity id."),
  limit: z
    .number()
    .int()
    .positive()
    .max(200)
    .optional()
    .describe("Max rows to return (default 50)."),
});

export async function listActivityExecute(
  ctx: ToolContext,
  input: z.infer<typeof listActivityInputSchema>
): Promise<unknown> {
  return await listActivity(ctx.organizationId, {
    entityType: input.entityType,
    entityId: input.entityId,
    limit: input.limit,
  });
}
