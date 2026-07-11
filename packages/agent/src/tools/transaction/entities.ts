import { getEntity, listEntities } from "@workspace/core/transaction";
import { z } from "zod";
import type { AgentToolsContext } from "../../types";
import { defineOrgTool } from "../define-org-tool";

// Read-only entity (customer / counterparty) tools (ALW-402). An entity carries
// its cached AR `balance` projection, `creditBalance`, and optional
// `creditLimit` — the grounding for "what does this customer owe?" questions.
// Read-only; `createEntity` is never an agent tool.
export const createEntityReadTools = (
  ctx: Pick<AgentToolsContext, "organizationId">
) => {
  const orgId = ctx.organizationId;
  return {
    list_entities: defineOrgTool({
      description:
        "List entities (customers / counterparties) with their cached AR balance, credit balance, and optional credit limit.",
      inputSchema: z.object({
        limit: z
          .number()
          .int()
          .positive()
          .max(200)
          .optional()
          .describe("Max rows to return (default 50)."),
      }),
      // Cap the rows handed back to the model (context safety); read stays org-scoped.
      execute: async ({ limit }) =>
        (await listEntities(orgId)).slice(0, limit ?? 50),
    }),
    get_entity: defineOrgTool({
      description:
        "Get one entity (customer / counterparty) by ID: its AR balance, store-credit balance, and credit limit. Amounts are integer minor units.",
      inputSchema: z.object({ id: z.string() }),
      requireData: true,
      notFoundMessage: ({ id }) => `Entity not found: ${id}`,
      execute: async ({ id }) => getEntity(id, orgId),
    }),
  };
};
