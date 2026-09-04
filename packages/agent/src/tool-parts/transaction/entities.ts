import { getEntity, listEntities } from "@workspace/core/transaction";
import { z } from "zod";
import { requireFound } from "../../tools/tool-result";
import type { ToolContext } from "../context";

export const listEntitiesName = "list_entities";

export const listEntitiesDescription =
  "List entities (customers / counterparties) with their cached AR balance, credit balance, and optional credit limit.";

export const listEntitiesInputSchema = z.object({
  limit: z
    .number()
    .int()
    .positive()
    .max(200)
    .optional()
    .describe("Max rows to return (default 50)."),
});

export async function listEntitiesExecute(
  ctx: ToolContext,
  input: z.infer<typeof listEntitiesInputSchema>
): Promise<unknown> {
  return (await listEntities(ctx.organizationId)).slice(0, input.limit ?? 50);
}

export const getEntityName = "get_entity";

export const getEntityDescription =
  "Get one entity (customer / counterparty) by ID: its AR balance, store-credit balance, and credit limit. Amounts are integer minor units.";

export const getEntityInputSchema = z.object({ id: z.string() });

export async function getEntityExecute(
  ctx: ToolContext,
  input: z.infer<typeof getEntityInputSchema>
): Promise<unknown> {
  return requireFound(
    await getEntity(input.id, ctx.organizationId),
    `Entity not found: ${input.id}`
  );
}
