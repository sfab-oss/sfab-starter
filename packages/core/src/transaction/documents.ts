import type {
  CreateDocumentInput,
  LineItemInput,
} from "@workspace/contract/transaction";
import { db } from "@workspace/db";
import type { Document, DocumentType, LineItem } from "@workspace/db/schema";
import { documents, lineItems } from "@workspace/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { documentFamily } from "./family";
import { computeLineTax, computeLineTaxableBase } from "./totals";

/**
 * Document + line-item reads/writes for Transaction Core. Money values are
 * integer minor units; `taxAmount` is computed and frozen at finalize.
 *
 * @see docs/architecture/transaction-core.md §1, §8
 */

export async function createDocument(
  orgId: string,
  input: CreateDocumentInput
): Promise<Document> {
  const family = documentFamily(input.type);
  const [doc] = await db
    .insert(documents)
    .values({
      organizationId: orgId,
      type: input.type,
      family,
      direction: input.direction,
      status: "draft",
      entityId: input.entityId ?? null,
      entityName: input.entityName ?? null,
      currencyCode: input.currencyCode ?? "USD",
      series: input.series ?? null,
    })
    .returning();
  if (!doc) {
    throw new Error("Failed to create document");
  }
  return doc;
}

export async function addLineItem(
  orgId: string,
  documentId: string,
  input: LineItemInput
): Promise<LineItem> {
  // C5: lines may only be added to a draft — a finalized fiscal record is frozen.
  const [doc] = await db
    .select({ status: documents.status })
    .from(documents)
    .where(
      and(eq(documents.id, documentId), eq(documents.organizationId, orgId))
    );
  if (!doc) {
    throw new Error(`Document not found: ${documentId}`);
  }
  if (doc.status !== "draft") {
    throw new Error(
      `Cannot add lines to a ${doc.status} document (${documentId})`
    );
  }
  const discount = input.discount ?? 0;
  const taxRate = input.taxRate ?? 0;
  const taxMode = input.taxMode ?? "exclusive";
  const taxAmount = computeLineTax({
    unitPrice: input.unitPrice,
    quantity: input.quantity,
    discount,
    taxRate,
    taxMode,
  });
  const taxableBase = computeLineTaxableBase({
    unitPrice: input.unitPrice,
    quantity: input.quantity,
    discount,
  });
  const [line] = await db
    .insert(lineItems)
    .values({
      organizationId: orgId,
      documentId,
      productId: input.productId ?? null,
      description: input.description,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      discount,
      taxRate,
      taxCode: input.taxCode ?? null,
      taxMode,
      taxAmount,
      taxableBase,
      fulfillmentMode: input.fulfillmentMode ?? "none",
    })
    .returning();
  if (!line) {
    throw new Error("Failed to create line item");
  }
  return line;
}

export interface DocumentWithLines {
  doc: Document;
  lines: LineItem[];
}

export async function getDocumentWithLines(
  id: string,
  orgId: string
): Promise<DocumentWithLines | null> {
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.organizationId, orgId)));
  if (!doc) {
    return null;
  }
  const lines = await db
    .select()
    .from(lineItems)
    .where(
      and(eq(lineItems.documentId, id), eq(lineItems.organizationId, orgId))
    )
    .orderBy(lineItems.createdAt);
  return { doc, lines };
}

export async function listDocuments(
  orgId: string,
  type?: DocumentType
): Promise<Document[]> {
  const condition = type
    ? and(eq(documents.organizationId, orgId), eq(documents.type, type))
    : eq(documents.organizationId, orgId);
  return await db
    .select()
    .from(documents)
    .where(condition)
    .orderBy(desc(documents.createdAt));
}
