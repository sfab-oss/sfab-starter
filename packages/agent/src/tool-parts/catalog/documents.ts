import {
  documentListSchema,
  documentTypeSchema,
} from "@workspace/contract/transaction";
import {
  getDocumentWithLines,
  listDocuments,
} from "@workspace/core/transaction";
import { z } from "zod";
import { requireFound } from "../../tools/tool-result";
import type { ToolContext } from "../context";

export const listDocumentsName = "list_documents";

export const listDocumentsDescription =
  "List business documents (quotes, orders, invoices, etc.). Optional type filter.";

export const listDocumentsInputSchema = z.object({
  type: documentTypeSchema
    .optional()
    .describe("Filter to a single document type."),
});

export const listDocumentsOutputSchema = documentListSchema;

export async function listDocumentsExecute(
  ctx: ToolContext,
  input: z.infer<typeof listDocumentsInputSchema>
): Promise<unknown> {
  const docs = await listDocuments(
    ctx.organizationId,
    input.type ? { type: input.type } : undefined
  );
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
}

export const getDocumentName = "get_document";

export const getDocumentDescription =
  "Get one business document by ID with its line items and totals — including its settlement projection (payment status and amount paid). Amounts are integer minor units.";

export const getDocumentInputSchema = z.object({ id: z.string() });

export async function getDocumentExecute(
  ctx: ToolContext,
  input: z.infer<typeof getDocumentInputSchema>
): Promise<unknown> {
  return requireFound(
    await getDocumentWithLines(input.id, ctx.organizationId),
    `Document not found: ${input.id}`
  );
}
