import { db } from "@workspace/db";
import { documents, entities, paymentAllocations } from "@workspace/db/schema";
import { and, asc, eq, sql } from "drizzle-orm";
import { DomainError } from "../errors";

/**
 * Projection rebuilds — the authoritative source of truth (§4).
 *
 * `documents.amountPaid`/`balanceDue`/`paymentStatus` and `entity.balance`
 * are **projections** — persisted for O(1) reads, but **rebuildable** from
 * the payment/allocation facts. `lastAppliedPaymentId` is a perf hint only;
 * the authoritative rebuild is a **full scan** of non-reversed allocations.
 *
 * Reversals are **compensating rows**: a reversal inserts negated allocations.
 * The originals stay in place and cancel naturally in every SUM (C6) — no
 * `WHERE reversed_at IS NULL` filter is ever applied.
 *
 * @see docs/architecture/transaction-core.md §4
 */

export interface DocumentPaymentProjection {
  amountPaid: number;
  balanceDue: number;
  paymentStatus: "unpaid" | "partial" | "paid";
}

/**
 * Derive payment status from raw amounts — the single JS source of truth.
 * The SQL CASE in `docProjectionUpdate` below must mirror this. Both must
 * agree for the "rebuildable projection" guarantee (§4) to hold.
 */
export function derivePaymentStatus(
  amountPaid: number,
  total: number
): "unpaid" | "partial" | "paid" {
  const balance = total - amountPaid;
  if (balance <= 0) {
    return "paid";
  }
  if (amountPaid > 0) {
    return "partial";
  }
  return "unpaid";
}

// ---------------------------------------------------------------------------
// Batch-statement builders — shared by recordPayment, reversePayment, finalize
// ---------------------------------------------------------------------------

/** Build the SQL subquery that sums live allocations for a document. */
export function allocSumSubquery(docId: string, orgId: string) {
  // No `reversed_at IS NULL` filter: compensating rows (reversals) cancel
  // originals naturally in the SUM (C6). `reversedAt` is a display/audit
  // marker, not a projection filter.
  return sql`(
    SELECT COALESCE(SUM(amount), 0) FROM payment_allocations
    WHERE document_id = ${docId}
      AND organization_id = ${orgId}
  )`;
}

/** Build a document projection UPDATE statement for the batch. */
export function docProjectionUpdate(
  docId: string,
  orgId: string,
  now: string,
  paymentId?: string
) {
  const allocSum = allocSumSubquery(docId, orgId);
  return db
    .update(documents)
    .set({
      amountPaid: allocSum,
      balanceDue: sql`${documents.total} - ${allocSum}`,
      paymentStatus: sql`CASE
        -- Mirrors derivePaymentStatus() above — keep in sync (§4).
        WHEN ${documents.total} - ${allocSum} <= 0 THEN 'paid'
        WHEN ${allocSum} > 0 THEN 'partial'
        ELSE 'unpaid'
      END`,
      ...(paymentId ? { lastAppliedPaymentId: paymentId } : {}),
      updatedAt: now,
    })
    .where(and(eq(documents.id, docId), eq(documents.organizationId, orgId)));
}

/**
 * Build an entity balance + credit-balance UPDATE statement for the batch.
 *
 * Sets both `balance` (net AR = Σ open fiscal-sales balanceDue − creditBalance)
 * and `creditBalance` (Σ wallet entries) in a single UPDATE. Every settlement
 * mutation that touches an entity's financial state includes this statement so
 * the two columns never drift.
 */
export function entityBalanceUpdate(
  entityId: string,
  orgId: string,
  now: string
) {
  const arSubquery = sql`(
    SELECT COALESCE(SUM(balance_due), 0) FROM documents
    WHERE entity_id = ${entityId}
      AND organization_id = ${orgId}
      AND family = 'fiscal'
      AND direction = 'sales'
      AND status = 'finalized'
  )`;
  const creditSubquery = sql`(
    SELECT COALESCE(SUM(amount), 0) FROM customer_credit
    WHERE entity_id = ${entityId}
      AND organization_id = ${orgId}
  )`;
  return db
    .update(entities)
    .set({
      balance: sql`${arSubquery} - ${creditSubquery}`,
      creditBalance: creditSubquery,
      updatedAt: now,
    })
    .where(and(eq(entities.id, entityId), eq(entities.organizationId, orgId)));
}

/**
 * Recompute a document's payment projections from the full allocation scan.
 * This is the correctness backstop: call it after any settlement mutation,
 * or to repair drift from races.
 */
export async function rebuildDocumentPayment(
  documentId: string,
  orgId: string
): Promise<DocumentPaymentProjection> {
  const [doc] = await db
    .select({ total: documents.total })
    .from(documents)
    .where(
      and(eq(documents.id, documentId), eq(documents.organizationId, orgId))
    );
  if (!doc) {
    throw new DomainError(`Document not found: ${documentId}`, "not_found");
  }

  // Full scan of ALL allocations (including compensating reversal rows).
  // Reversed originals + their compensating negatives cancel in the SUM (C6).
  // Ordered by createdAt so lastAppliedPaymentId is deterministic.
  const allocs = await db
    .select({
      amount: paymentAllocations.amount,
      paymentId: paymentAllocations.paymentId,
    })
    .from(paymentAllocations)
    .where(
      and(
        eq(paymentAllocations.documentId, documentId),
        eq(paymentAllocations.organizationId, orgId)
      )
    )
    .orderBy(asc(paymentAllocations.createdAt));

  const amountPaid = allocs.reduce((sum, a) => sum + a.amount, 0);
  const balanceDue = doc.total - amountPaid;
  const paymentStatus = derivePaymentStatus(amountPaid, doc.total);

  const lastPaymentId =
    allocs.length > 0 ? (allocs.at(-1)?.paymentId ?? null) : null;

  await db
    .update(documents)
    .set({
      amountPaid,
      balanceDue,
      paymentStatus,
      lastAppliedPaymentId: lastPaymentId,
    })
    .where(
      and(eq(documents.id, documentId), eq(documents.organizationId, orgId))
    );

  return { amountPaid, balanceDue, paymentStatus };
}

/**
 * Recompute an entity's balance and creditBalance projections by executing
 * the authoritative `entityBalanceUpdate` SQL and reading the row back.
 * Both columns are set in a single UPDATE — one source of truth for the
 * formula `balance = AR − creditBalance`.
 *
 * AP bills (direction = 'purchase') are excluded — they never poison a
 * customer's fiado balance (C2).
 */
export async function rebuildEntityBalance(
  entityId: string,
  orgId: string
): Promise<number> {
  await entityBalanceUpdate(entityId, orgId, new Date().toISOString());
  const [row] = await db
    .select({ balance: entities.balance })
    .from(entities)
    .where(and(eq(entities.id, entityId), eq(entities.organizationId, orgId)));
  return row?.balance ?? 0;
}

/**
 * Recompute an entity's wallet credit balance. Delegates to
 * `entityBalanceUpdate` (which sets both `balance` and `creditBalance` in
 * one UPDATE) and reads the `creditBalance` column back.
 */
export async function rebuildCreditBalance(
  entityId: string,
  orgId: string
): Promise<number> {
  await entityBalanceUpdate(entityId, orgId, new Date().toISOString());
  const [row] = await db
    .select({ creditBalance: entities.creditBalance })
    .from(entities)
    .where(and(eq(entities.id, entityId), eq(entities.organizationId, orgId)));
  return row?.creditBalance ?? 0;
}
