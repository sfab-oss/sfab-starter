import {
  documentListSchema,
  documentTypeSchema,
} from "@workspace/contract/transaction";
import { listDocuments } from "@workspace/core/transaction";
import { tool } from "ai";
import { z } from "zod";
import type { AgentToolsContext } from "../../types";

// Read-only document access for the agent. Money/document MUTATIONS stay off the
// agent by convention (guard.ts) — finalize/recordPayment are user-gated in the
// UI; the agent reasons over the resulting state, never authors it.
export const createDocumentTools = (ctx: AgentToolsContext) => {
  const orgId = ctx.organizationId;
  return {
    "list-documents": tool({
      description:
        "List business documents (quotes, orders, invoices, etc.). Optional type filter.",
      inputSchema: z.object({
        type: documentTypeSchema
          .optional()
          .describe("Filter to a single document type."),
      }),
      outputSchema: documentListSchema,
      execute: async ({ type }) => {
        const docs = await listDocuments(orgId, type);
        return docs.map((d) => ({
          id: d.id,
          type: d.type,
          status: d.status,
          entityName: d.entityName,
          currencyCode: d.currencyCode,
          total: d.total,
          folio: d.folio,
          createdAt: d.createdAt,
        }));
      },
    }),
  };
};
