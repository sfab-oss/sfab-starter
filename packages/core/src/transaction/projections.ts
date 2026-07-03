import { db } from "@workspace/db";
import { documents, entities, paymentAllocations } from "@workspace/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { DomainError } from "../errors";

/**
 * Projection rebuilds — the authoritative source of truth (§4).
 *
 * `documents.amountPaid`/`balanceDue`/`paymentStatus` and `entity.balance`
 * are **projections** — persisted for O(1) reads, but **rebuildable** from
 * the payment/allocation facts. `lastAppliedPaymentId` is a perf hint only;
 * the authoritative rebuild is a **full scan** of non-reversed allocations.
 *
 * Reversals are **compensating rows**: a reversal inserts negated allocations
 * and marks the originals `reversedAt`, so the SUM naturally excludes them.
 *
 * @see docs/architecture/transaction-core.md §4
 */

export interface DocumentPaymentProjection {
  amountPaid: number;
  balanceDue: number;
  paymentStatus: "unpaid" | "partial" | "paid";
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

  const allocs = await db
    .select({
      amount: paymentAllocations.amount,
      paymentId: paymentAllocations.paymentId,
    })
    .from(paymentAllocations)
    .where(
      and(
        eq(paymentAllocations.documentId, documentId),
        eq(paymentAllocations.organizationId, orgId),
        isNull(paymentAllocations.reversedAt)
      )
    );

  const amountPaid = allocs.reduce((sum, a) => sum + a.amount, 0);
  const balanceDue = doc.total - amountPaid;
  let paymentStatus: "unpaid" | "partial" | "paid";
  if (balanceDue <= 0) {
    paymentStatus = "paid";
  } else if (amountPaid > 0) {
    paymentStatus = "partial";
  } else {
    paymentStatus = "unpaid";
  }

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
 * Recompute an entity's AR balance from all open finalized fiscal-sales docs.
 * AP bills (direction = 'purchase') are excluded — they never poison a
 * customer's fiado balance (C2).
 */
export async function rebuildEntityBalance(
  entityId: string,
  orgId: string
): Promise<number> {
  const [row] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${documents.balanceDue}), 0)`.as("total"),
    })
    .from(documents)
    .where(
      and(
        eq(documents.organizationId, orgId),
        eq(documents.entityId, entityId),
        eq(documents.family, "fiscal"),
        eq(documents.direction, "sales"),
        eq(documents.status, "finalized")
      )
    );

  const balance = row?.total ?? 0;

  await db
    .update(entities)
    .set({ balance })
    .where(and(eq(entities.id, entityId), eq(entities.organizationId, orgId)));

  return balance;
}
