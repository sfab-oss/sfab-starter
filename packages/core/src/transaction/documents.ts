import type {
  CreateDocumentInput,
  CreateSuccessorInput,
  LineItemInput,
  ListDocumentsQuery,
  UpdateLineItemInput,
} from "@workspace/contract/transaction";
import { createId, db } from "@workspace/db";
import type { Document, DocumentType, LineItem } from "@workspace/db/schema";
import { activityLog, documents, lineItems } from "@workspace/db/schema";
import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { DomainError } from "../errors";
import {
  buildPaginatedResponse,
  getPaginationOffsetLimit,
} from "../pagination";
import { getEntity } from "./entities";
import { documentFamily } from "./family";
import {
  computeDocumentTotals,
  computeLineTax,
  computeLineTaxableBase,
  type DocumentTotals,
} from "./totals";

/**
 * Document + line-item reads/writes for Transaction Core. Money values are
 * integer minor units; `taxAmount` is computed and frozen at finalize.
 *
 * Progression is by immutable successor (`createSuccessor`) — never by
 * mutating `type` on an existing header.
 *
 * @see docs/architecture/transaction-core.md §1, §8
 */

const documentSortColumns = {
  createdAt: documents.createdAt,
  type: documents.type,
  status: documents.status,
  total: documents.total,
  entityName: documents.entityName,
  folio: documents.folio,
} as const;

const V1_CREATE_DIRECTION: Partial<Record<DocumentType, "sales" | "purchase">> =
  {
    quote: "sales",
    invoice: "sales",
    bill: "purchase",
  };

type BatchItem = Parameters<typeof db.batch>[0][number];

async function requireDraftDocument(
  orgId: string,
  documentId: string
): Promise<Document> {
  const [doc] = await db
    .select()
    .from(documents)
    .where(
      and(eq(documents.id, documentId), eq(documents.organizationId, orgId))
    );
  if (!doc) {
    throw new DomainError(`Document not found: ${documentId}`, "not_found");
  }
  if (doc.status !== "draft") {
    throw new DomainError(
      `Cannot modify lines on a ${doc.status} document (${documentId})`,
      "conflict"
    );
  }
  return doc;
}

/**
 * Public line APIs accept positive quantities/discounts only. Credit notes
 * store reverse value as negative quantity and discount (unitPrice stays ≥ 0).
 */
function signedQuantityForDocument(doc: Document, quantity: number): number {
  if (doc.type === "credit_note") {
    return -Math.abs(quantity);
  }
  if (quantity < 0) {
    throw new DomainError(
      "Negative quantity is only allowed on credit notes",
      "unprocessable"
    );
  }
  return quantity;
}

function signedDiscountForDocument(doc: Document, discount: number): number {
  if (doc.type === "credit_note") {
    return -Math.abs(discount);
  }
  if (discount < 0) {
    throw new DomainError(
      "Negative discount is only allowed on credit notes",
      "unprocessable"
    );
  }
  return discount;
}

function buildLineValues(
  orgId: string,
  documentId: string,
  input: LineItemInput
) {
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
    taxMode,
    taxRate,
  });
  return {
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
  };
}

export async function createDocument(
  orgId: string,
  input: CreateDocumentInput
): Promise<Document> {
  if (input.type === "credit_note") {
    throw new DomainError(
      "Credit notes are created only as successors of a finalized invoice",
      "unprocessable"
    );
  }

  const family = documentFamily(input.type);
  const expectedDirection = V1_CREATE_DIRECTION[input.type];
  if (expectedDirection && input.direction !== expectedDirection) {
    throw new DomainError(
      `${input.type} must use direction "${expectedDirection}"`,
      "unprocessable"
    );
  }

  const entityId = input.entityId ?? null;
  let entityName = input.entityName ?? null;

  if (entityId) {
    const entity = await getEntity(entityId, orgId);
    if (!entity || entity.archivedAt) {
      throw new DomainError(`Entity not found: ${entityId}`, "not_found");
    }
    entityName = entity.name;
  } else if (!entityName) {
    entityName = "Walk-in";
  }

  const [doc] = await db
    .insert(documents)
    .values({
      organizationId: orgId,
      type: input.type,
      family,
      direction: input.direction,
      status: "draft",
      entityId,
      entityName,
      currencyCode: input.currencyCode ?? "USD",
      series: input.series ?? null,
    })
    .returning();
  if (!doc) {
    throw new DomainError("Failed to create document", "unprocessable");
  }
  return doc;
}

export async function addLineItem(
  orgId: string,
  documentId: string,
  input: LineItemInput
): Promise<LineItem> {
  const doc = await requireDraftDocument(orgId, documentId);
  const [line] = await db
    .insert(lineItems)
    .values(
      buildLineValues(orgId, documentId, {
        ...input,
        quantity: signedQuantityForDocument(doc, input.quantity),
        discount: signedDiscountForDocument(doc, input.discount ?? 0),
      })
    )
    .returning();
  if (!line) {
    throw new DomainError("Failed to create line item", "unprocessable");
  }
  return line;
}

export async function updateLineItem(
  orgId: string,
  documentId: string,
  lineId: string,
  input: UpdateLineItemInput
): Promise<LineItem> {
  const doc = await requireDraftDocument(orgId, documentId);

  const [existing] = await db
    .select()
    .from(lineItems)
    .where(
      and(
        eq(lineItems.id, lineId),
        eq(lineItems.documentId, documentId),
        eq(lineItems.organizationId, orgId)
      )
    );
  if (!existing) {
    throw new DomainError(`Line item not found: ${lineId}`, "not_found");
  }

  const quantity =
    input.quantity !== undefined
      ? signedQuantityForDocument(doc, input.quantity)
      : existing.quantity;

  const discount =
    input.discount !== undefined
      ? signedDiscountForDocument(doc, input.discount)
      : existing.discount;

  const next = {
    productId:
      input.productId !== undefined ? input.productId : existing.productId,
    description: input.description ?? existing.description,
    quantity,
    unitPrice: input.unitPrice ?? existing.unitPrice,
    discount,
    taxRate: input.taxRate ?? existing.taxRate,
    taxCode: input.taxCode !== undefined ? input.taxCode : existing.taxCode,
    taxMode: input.taxMode ?? existing.taxMode,
    fulfillmentMode: input.fulfillmentMode ?? existing.fulfillmentMode,
  };

  const taxAmount = computeLineTax({
    unitPrice: next.unitPrice,
    quantity: next.quantity,
    discount: next.discount,
    taxRate: next.taxRate,
    taxMode: next.taxMode,
  });
  const taxableBase = computeLineTaxableBase({
    unitPrice: next.unitPrice,
    quantity: next.quantity,
    discount: next.discount,
    taxMode: next.taxMode,
    taxRate: next.taxRate,
  });

  const [updated] = await db
    .update(lineItems)
    .set({
      ...next,
      taxAmount,
      taxableBase,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(lineItems.id, lineId),
        eq(lineItems.documentId, documentId),
        eq(lineItems.organizationId, orgId)
      )
    )
    .returning();

  if (!updated) {
    throw new DomainError(`Line item not found: ${lineId}`, "not_found");
  }
  return updated;
}

export async function removeLineItem(
  orgId: string,
  documentId: string,
  lineId: string
): Promise<{ id: string }> {
  await requireDraftDocument(orgId, documentId);

  const deleted = await db
    .delete(lineItems)
    .where(
      and(
        eq(lineItems.id, lineId),
        eq(lineItems.documentId, documentId),
        eq(lineItems.organizationId, orgId)
      )
    )
    .returning({ id: lineItems.id });

  if (!deleted[0]) {
    throw new DomainError(`Line item not found: ${lineId}`, "not_found");
  }
  return deleted[0];
}

/**
 * Accept a commercial draft (quote) so it can be converted via successor.
 * Fiscal docs use `finalizeDocument` instead.
 */
export async function acceptDocument(
  orgId: string,
  documentId: string,
  opts?: { actorId?: string | null }
): Promise<Document> {
  const [doc] = await db
    .select()
    .from(documents)
    .where(
      and(eq(documents.id, documentId), eq(documents.organizationId, orgId))
    );
  if (!doc) {
    throw new DomainError(`Document not found: ${documentId}`, "not_found");
  }
  if (documentFamily(doc.type) !== "commercial") {
    throw new DomainError(
      `Only commercial documents can be accepted (${doc.type})`,
      "unprocessable"
    );
  }
  if (doc.status !== "draft" && doc.status !== "sent") {
    throw new DomainError(
      `Cannot accept a ${doc.status} document (${documentId})`,
      "conflict"
    );
  }

  const lines = await db
    .select()
    .from(lineItems)
    .where(
      and(
        eq(lineItems.documentId, documentId),
        eq(lineItems.organizationId, orgId)
      )
    );
  if (lines.length === 0) {
    throw new DomainError(
      `Cannot accept document ${documentId} with no line items`,
      "unprocessable"
    );
  }

  const totals = computeDocumentTotals(lines);
  const now = new Date().toISOString();

  const [accepted] = await db
    .update(documents)
    .set({
      status: "accepted",
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      taxTotal: totals.taxTotal,
      total: totals.total,
      issuedAt: doc.issuedAt ?? now,
      updatedAt: now,
    })
    .where(
      and(
        eq(documents.id, documentId),
        eq(documents.organizationId, orgId),
        or(eq(documents.status, "draft"), eq(documents.status, "sent"))
      )
    )
    .returning();

  if (!accepted) {
    throw new DomainError(
      `Document ${documentId} could not be accepted`,
      "conflict"
    );
  }

  await db.insert(activityLog).values({
    organizationId: orgId,
    kind: "event",
    eventType: "document_accepted",
    entityType: "document",
    entityId: documentId,
    actorId: opts?.actorId ?? null,
    summary: "Quote accepted",
    createdAt: now,
  });

  return accepted;
}

function assertSuccessorAllowed(
  parent: Document,
  type: CreateSuccessorInput["type"]
): void {
  if (type === "invoice") {
    if (parent.type !== "quote") {
      throw new DomainError(
        "Only a quote can convert to an invoice",
        "unprocessable"
      );
    }
    if (parent.status !== "accepted") {
      throw new DomainError(
        "Quote must be accepted before converting to an invoice",
        "conflict"
      );
    }
    return;
  }

  if (parent.type !== "invoice") {
    throw new DomainError(
      "Only a finalized invoice can create a credit note",
      "unprocessable"
    );
  }
  if (parent.status !== "finalized") {
    throw new DomainError(
      "Invoice must be finalized before creating a credit note",
      "conflict"
    );
  }
}

/**
 * Create an immutable successor: new header + copied line snapshots, linked by
 * `sourceDocumentId` / `rootDocumentId`. Supported v1 edges:
 * - accepted quote → invoice draft
 * - finalized invoice → credit_note draft (reversed quantities)
 */
export async function createSuccessor(
  orgId: string,
  sourceDocumentId: string,
  input: CreateSuccessorInput,
  opts?: { actorId?: string | null }
): Promise<DocumentWithLines> {
  const source = await getDocumentWithLines(sourceDocumentId, orgId);
  if (!source) {
    throw new DomainError(
      `Document not found: ${sourceDocumentId}`,
      "not_found"
    );
  }
  const { doc: parent, lines } = source;
  assertSuccessorAllowed(parent, input.type);

  if (lines.length === 0) {
    throw new DomainError(
      `Cannot create successor from document ${sourceDocumentId} with no lines`,
      "unprocessable"
    );
  }

  const family = documentFamily(input.type);
  const rootDocumentId = parent.rootDocumentId ?? parent.id;
  const successorId = createId();
  const now = new Date().toISOString();
  const negate = input.type === "credit_note";
  const convertingQuote = input.type === "invoice" && parent.type === "quote";

  // Claim the quote before minting the invoice so concurrent converts cannot
  // both pass assertSuccessorAllowed and create duplicate successors.
  if (convertingQuote) {
    const [claimed] = await db
      .update(documents)
      .set({ status: "converted", updatedAt: now })
      .where(
        and(
          eq(documents.id, parent.id),
          eq(documents.organizationId, orgId),
          eq(documents.status, "accepted")
        )
      )
      .returning();
    if (!claimed) {
      throw new DomainError(
        `Quote ${parent.id} could not be converted (already converted or not accepted)`,
        "conflict"
      );
    }
  }

  // Pre-generate ids so header + lines are one atomic batch (same pattern as
  // finalize/payments/wallet). D1 has no interactive tx.
  const batchStmts: BatchItem[] = [
    db.insert(documents).values({
      id: successorId,
      organizationId: orgId,
      type: input.type,
      family,
      direction: parent.direction,
      status: "draft",
      entityId: parent.entityId,
      entityName: parent.entityName,
      currencyCode: parent.currencyCode,
      series: parent.series,
      sourceDocumentId: parent.id,
      rootDocumentId,
      reversesDocumentId: negate ? parent.id : null,
    }),
    // Credit notes reverse value via negative quantity AND discount so
    // taxableBase/total are exact negatives of the source (unitPrice ≥ 0).
    ...lines.map((line) =>
      db.insert(lineItems).values(
        buildLineValues(orgId, successorId, {
          productId: line.productId ?? undefined,
          description: line.description,
          quantity: negate ? -Math.abs(line.quantity) : line.quantity,
          unitPrice: Math.abs(line.unitPrice),
          discount: negate ? -Math.abs(line.discount) : line.discount,
          taxRate: line.taxRate,
          taxCode: line.taxCode,
          taxMode: line.taxMode,
          fulfillmentMode: line.fulfillmentMode,
        })
      )
    ),
  ];

  if (convertingQuote) {
    batchStmts.push(
      db.insert(activityLog).values({
        organizationId: orgId,
        kind: "event",
        eventType: "quote_converted",
        entityType: "document",
        entityId: parent.id,
        actorId: opts?.actorId ?? null,
        summary: `Quote converted to ${input.type}`,
        metadata: { successorId },
        createdAt: now,
      })
    );
  }

  batchStmts.push(
    db.insert(activityLog).values({
      organizationId: orgId,
      kind: "event",
      eventType: "document_created",
      entityType: "document",
      entityId: successorId,
      actorId: opts?.actorId ?? null,
      summary:
        input.type === "invoice"
          ? "Invoice draft created from quote"
          : `${input.type} draft created`,
      metadata: { sourceDocumentId: parent.id },
      createdAt: now,
    })
  );

  await db.batch(batchStmts as [BatchItem, ...BatchItem[]]);

  const result = await getDocumentWithLines(successorId, orgId);
  if (!result) {
    throw new DomainError(
      "Successor created but could not be loaded",
      "unprocessable"
    );
  }
  return result;
}

export interface DocumentWithLines {
  doc: Document;
  lines: LineItem[];
  /** Computed totals for drafts (frozen values on the doc are used after finalize). */
  draftTotals?: DocumentTotals;
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
  return {
    doc,
    lines,
    draftTotals:
      doc.status === "draft" ? computeDocumentTotals(lines) : undefined,
  };
}

export async function listDocuments(
  orgId: string,
  filter?: { type?: DocumentType; entityId?: string }
): Promise<Document[]> {
  const conditions = [eq(documents.organizationId, orgId)];
  if (filter?.type) {
    conditions.push(eq(documents.type, filter.type));
  }
  if (filter?.entityId) {
    conditions.push(eq(documents.entityId, filter.entityId));
  }
  return await db
    .select()
    .from(documents)
    .where(and(...conditions))
    .orderBy(desc(documents.createdAt));
}

export async function getPaginatedDocuments(
  orgId: string,
  params: ListDocumentsQuery
) {
  const { offset, limit } = getPaginationOffsetLimit(params);
  const conditions = [eq(documents.organizationId, orgId)];

  if (params.type) {
    conditions.push(eq(documents.type, params.type));
  }
  if (params.direction) {
    conditions.push(eq(documents.direction, params.direction));
  }
  if (params.status) {
    conditions.push(eq(documents.status, params.status));
  }
  if (params.entityId) {
    conditions.push(eq(documents.entityId, params.entityId));
  }
  if (params.search) {
    const pattern = `%${params.search}%`;
    const searchCondition = or(
      like(documents.entityName, pattern),
      like(documents.series, pattern),
      sql`cast(${documents.folio} as text) like ${pattern}`
    );
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  const whereClause = and(...conditions);

  const countResult = await db
    .select({ total: sql<number>`count(*)`.mapWith(Number) })
    .from(documents)
    .where(whereClause);
  const total = countResult[0]?.total ?? 0;

  const sortColumn =
    params.sortBy && params.sortBy in documentSortColumns
      ? documentSortColumns[params.sortBy as keyof typeof documentSortColumns]
      : null;
  const dirFn = params.sortOrder === "desc" ? desc : asc;
  const sortTarget = sortColumn ?? documents.createdAt;

  const data = await db
    .select()
    .from(documents)
    .where(whereClause)
    .orderBy(dirFn(sortTarget))
    .limit(limit)
    .offset(offset);

  return buildPaginatedResponse(data, total, params);
}
