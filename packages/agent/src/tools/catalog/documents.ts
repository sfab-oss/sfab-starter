import {
  documentListSchema,
  documentTypeSchema,
} from "@workspace/contract/transaction";
import {
  getDocumentWithLines,
  listDocuments,
} from "@workspace/core/transaction";
import { z } from "zod";
import type { AgentToolsContext } from "../../types";
import { defineOrgTool } from "../define-org-tool";
import { requireFound } from "../tool-result";

// Read-only document access for the agent. Money/document MUTATIONS stay off the
// agent by convention (guard.ts) — finalize/recordPayment are user-gated in the
// UI; the agent reasons over the resulting state, never authors it.
export const createDocumentTools = (
  ctx: Pick<AgentToolsContext, "organizationId">
) => {
  const orgId = ctx.organizationId;
  return {
    list_documents: defineOrgTool({
      description:
        "List business documents (quotes, orders, invoices, etc.). Optional type filter.",
      inputSchema: z.object({
        type: documentTypeSchema
          .optional()
          .describe("Filter to a single document type."),
      }),
      outputSchema: documentListSchema,
      execute: async ({ type }) => {
        const docs = await listDocuments(orgId, type ? { type } : undefined);
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
    get_document: defineOrgTool({
      description:
        "Get one business document by ID with its line items and totals — including its settlement projection (payment status and amount paid). Amounts are integer minor units.",
      inputSchema: z.object({ id: z.string() }),
      execute: async ({ id }) =>
        requireFound(
          await getDocumentWithLines(id, orgId),
          `Document not found: ${id}`
        ),
    }),
  };
};
