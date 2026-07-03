import type { RecordPaymentInput } from "@workspace/contract/transaction";
import { createId, db } from "@workspace/db";
import type { Document, Payment } from "@workspace/db/schema";
import {
  activityLog,
  documents,
  entities,
  paymentAllocations,
  payments,
} from "@workspace/db/schema";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { DomainError } from "../errors";
import { documentFamily } from "./family";

/**
 * Settlement engine — payments, allocations, and projections (§4).
 *
 * A payment is a **header + allocation rows**. `recordPayment` writes both and
 * updates every touched document's projection **atomically in one `db.batch()`**.
 * D1 has no interactive transactions, so every multi-write mutation here is a
 * single batch of pre-assembled statements; reads happen before assembly (TOCTOU
 * accepted; `rebuild*` is the correctness backstop).
 *
 * Reversals are **compensating rows** (C6): a reversal payment carries negated
 * allocations and marks the originals `reversedAt`, so the SUM naturally
 * excludes them. Reversing an old payment can never leave a stale "paid".
 *
 * @see docs/architecture/transaction-core.md §4
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Validate that every target document is fiscal + finalized (§4). */
function validateAllocationTargets(docs: Document[]): void {
  for (const doc of docs) {
    const family = documentFamily(doc.type);
    if (family !== "fiscal") {
      throw new DomainError(
        `Allocations may target fiscal documents only — "${doc.id}" is a ${family} document`,
        "unprocessable"
      );
    }
    if (doc.status !== "finalized") {
      throw new DomainError(
        `Allocations may target finalized documents only — "${doc.id}" is ${doc.status}`,
        "conflict"
      );
    }
  }
}

/** Detect which docs will transition to "paid" from this payment's allocations. */
function detectNewlyCompletedSales(
  docs: Document[],
  allocations: RecordPaymentInput["allocations"]
): string[] {
  const docById = new Map(docs.map((d) => [d.id, d]));
  const allocSums = new Map<string, number>();
  for (const a of allocations) {
    allocSums.set(a.documentId, (allocSums.get(a.documentId) ?? 0) + a.amount);
  }
  const completed: string[] = [];
  for (const [docId, doc] of docById) {
    if (doc.paymentStatus === "paid") {
      continue;
    }
    const newAmountPaid = doc.amountPaid + (allocSums.get(docId) ?? 0);
    if (newAmountPaid >= doc.total) {
      completed.push(docId);
    }
  }
  return completed;
}

/** Build the SQL subquery that sums live allocations for a document. */
function allocSumSubquery(docId: string, orgId: string) {
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
function docProjectionUpdate(
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
        WHEN ${documents.total} - ${allocSum} <= 0 THEN 'paid'
        WHEN ${allocSum} > 0 THEN 'partial'
        ELSE 'unpaid'
      END`,
      ...(paymentId ? { lastAppliedPaymentId: paymentId } : {}),
      updatedAt: now,
    })
    .where(and(eq(documents.id, docId), eq(documents.organizationId, orgId)));
}

/** Build an entity balance UPDATE statement for the batch. */
function entityBalanceUpdate(entityId: string, orgId: string, now: string) {
  return db
    .update(entities)
    .set({
      balance: sql`(
        SELECT COALESCE(SUM(balance_due), 0) FROM documents
        WHERE entity_id = ${entityId}
          AND organization_id = ${orgId}
          AND family = 'fiscal'
          AND direction = 'sales'
          AND status = 'finalized'
      )`,
      updatedAt: now,
    })
    .where(and(eq(entities.id, entityId), eq(entities.organizationId, orgId)));
}

// ---------------------------------------------------------------------------
// recordPayment
// ---------------------------------------------------------------------------

export interface RecordPaymentResult {
  paymentId: string;
  touchedDocuments: string[];
  completedSales: string[];
}

/**
 * Record a payment with allocations, updating every touched document's
 * projection atomically (§4). Allocations may target **fiscal documents only**.
 *
 * D1 constraint: the entire mutation — payment insert + allocation inserts +
 * document projection updates + entity balance update — is one `db.batch()`.
 * IDs are pre-generated so allocation rows can reference the payment within the
 * same batch without needing a separate round-trip.
 */
export async function recordPayment(
  orgId: string,
  input: RecordPaymentInput,
  opts: { actorId?: string } = {}
): Promise<RecordPaymentResult> {
  // 1. READ: validate all target documents are fiscal + finalized.
  const docIds = [...new Set(input.allocations.map((a) => a.documentId))];
  const docs = await db
    .select()
    .from(documents)
    .where(
      and(eq(documents.organizationId, orgId), inArray(documents.id, docIds))
    );

  if (docs.length !== docIds.length) {
    throw new DomainError(
      "One or more target documents not found",
      "not_found"
    );
  }

  validateAllocationTargets(docs);
  const completedSales = detectNewlyCompletedSales(docs, input.allocations);

  // 2. PRE-GENERATE IDs (so allocation rows reference the payment in-batch).
  const paymentId = createId("pmt");
  const now = new Date().toISOString();
  const paidAt = input.paidAt ?? now;

  // 3. ASSEMBLE the batch: payment + allocations + projection updates.
  type BatchStmt = Parameters<typeof db.batch>[0][number];
  const stmts: BatchStmt[] = [];

  // (a) Payment header.
  stmts.push(
    db.insert(payments).values({
      id: paymentId,
      organizationId: orgId,
      amount: input.amount,
      method: input.method,
      paidAt,
      reference: input.reference ?? null,
      idempotencyKey: input.idempotencyKey ?? null,
      entityId: input.entityId ?? null,
    })
  );

  // (b) Allocation rows (UPSERT under the unique index — AC-5).
  for (const alloc of input.allocations) {
    stmts.push(
      db
        .insert(paymentAllocations)
        .values({
          id: createId("alloc"),
          organizationId: orgId,
          paymentId,
          documentId: alloc.documentId,
          amount: alloc.amount,
          effectiveAt: alloc.effectiveAt ?? paidAt,
        })
        .onConflictDoUpdate({
          target: [
            paymentAllocations.organizationId,
            paymentAllocations.paymentId,
            paymentAllocations.documentId,
          ],
          set: {
            amount: alloc.amount,
            effectiveAt: alloc.effectiveAt ?? paidAt,
            updatedAt: now,
          },
        })
    );
  }

  // (c) Document projection updates.
  for (const docId of docIds) {
    stmts.push(docProjectionUpdate(docId, orgId, now, paymentId));
  }

  // (d) Entity balance update (if entityId provided).
  if (input.entityId) {
    stmts.push(entityBalanceUpdate(input.entityId, orgId, now));
  }

  // 4. EXECUTE — one atomic batch.
  await db.batch(stmts as [BatchStmt, ...BatchStmt[]]);

  // 5. POST-BATCH events (best-effort, same pattern as finalize).
  for (const docId of completedSales) {
    await db.insert(activityLog).values({
      organizationId: orgId,
      kind: "event",
      eventType: "sale_completed",
      entityType: "document",
      entityId: docId,
      actorId: opts.actorId ?? null,
      summary: "Sale completed (fully paid)",
      createdAt: now,
    });
  }

  await db.insert(activityLog).values({
    organizationId: orgId,
    kind: "event",
    eventType: "payment_recorded",
    entityType: "payment",
    entityId: paymentId,
    actorId: opts.actorId ?? null,
    summary: `Payment recorded: ${input.method}`,
    metadata: {
      amount: input.amount,
      method: input.method,
      allocations: input.allocations.length,
    },
    createdAt: now,
  });

  return { paymentId, touchedDocuments: docIds, completedSales };
}

// ---------------------------------------------------------------------------
// reversePayment
// ---------------------------------------------------------------------------

/**
 * Reverse a payment by writing **compensating rows** (C6): a reversal payment
 * header with negated amount + negated allocation rows. The original
 * allocations are marked `reversedAt` so projection subqueries exclude them.
 *
 * This guarantees that reversing an old payment can never leave a stale "paid":
 * the SUM of live allocations is immediately correct.
 */
export async function reversePayment(
  paymentId: string,
  orgId: string,
  opts: { actorId?: string; reason?: string } = {}
): Promise<{ reversalPaymentId: string; touchedDocuments: string[] }> {
  // 1. READ the original payment + allocations.
  const [payment] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.id, paymentId), eq(payments.organizationId, orgId)));
  if (!payment) {
    throw new DomainError(`Payment not found: ${paymentId}`, "not_found");
  }
  if (payment.reversesPaymentId) {
    throw new DomainError("Cannot reverse a reversal payment", "conflict");
  }

  // Check if already reversed.
  const [existing] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, orgId),
        eq(payments.reversesPaymentId, paymentId)
      )
    );
  if (existing) {
    throw new DomainError("Payment already reversed", "conflict");
  }

  const allocations = await db
    .select()
    .from(paymentAllocations)
    .where(
      and(
        eq(paymentAllocations.paymentId, paymentId),
        eq(paymentAllocations.organizationId, orgId),
        isNull(paymentAllocations.reversedAt)
      )
    );

  // 2. PRE-GENERATE IDs.
  const reversalPaymentId = createId("pmt");
  const now = new Date().toISOString();
  const touchedDocIds = new Set<string>();

  // 3. ASSEMBLE the batch.
  type BatchStmt = Parameters<typeof db.batch>[0][number];
  const stmts: BatchStmt[] = [];

  // (a) Reversal payment header (negated amount).
  stmts.push(
    db.insert(payments).values({
      id: reversalPaymentId,
      organizationId: orgId,
      amount: -payment.amount,
      method: payment.method,
      paidAt: now,
      reference: opts.reason ?? "Reversal",
      reversesPaymentId: paymentId,
      entityId: payment.entityId,
    })
  );

  // (b) Compensating allocations (negated) + mark originals reversedAt.
  for (const alloc of allocations) {
    touchedDocIds.add(alloc.documentId);
    stmts.push(
      db.insert(paymentAllocations).values({
        id: createId("alloc"),
        organizationId: orgId,
        paymentId: reversalPaymentId,
        documentId: alloc.documentId,
        amount: -alloc.amount,
        effectiveAt: now,
      })
    );
    stmts.push(
      db
        .update(paymentAllocations)
        .set({ reversedAt: now, updatedAt: now })
        .where(eq(paymentAllocations.id, alloc.id))
    );
  }

  // (c) Document projection updates + (d) entity balance.
  for (const docId of touchedDocIds) {
    stmts.push(docProjectionUpdate(docId, orgId, now));
  }

  if (payment.entityId) {
    stmts.push(entityBalanceUpdate(payment.entityId, orgId, now));
  }

  // 4. EXECUTE.
  await db.batch(stmts as [BatchStmt, ...BatchStmt[]]);

  // 5. POST-BATCH event.
  await db.insert(activityLog).values({
    organizationId: orgId,
    kind: "event",
    eventType: "payment_reversed",
    entityType: "payment",
    entityId: paymentId,
    actorId: opts.actorId ?? null,
    summary: `Payment reversed${opts.reason ? `: ${opts.reason}` : ""}`,
    metadata: { reversalPaymentId },
    createdAt: now,
  });

  return {
    reversalPaymentId,
    touchedDocuments: [...touchedDocIds],
  };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function listPayments(
  orgId: string,
  filter?: { entityId?: string }
): Promise<Payment[]> {
  const conditions = [eq(payments.organizationId, orgId)];
  if (filter?.entityId) {
    conditions.push(eq(payments.entityId, filter.entityId));
  }
  return await db
    .select()
    .from(payments)
    .where(and(...conditions))
    .orderBy(sql`${payments.createdAt} DESC`);
}

export async function getPaymentWithAllocations(
  paymentId: string,
  orgId: string
): Promise<{
  payment: Payment;
  allocations: (typeof paymentAllocations.$inferSelect)[];
} | null> {
  const [payment] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.id, paymentId), eq(payments.organizationId, orgId)));
  if (!payment) {
    return null;
  }
  const allocations = await db
    .select()
    .from(paymentAllocations)
    .where(
      and(
        eq(paymentAllocations.paymentId, paymentId),
        eq(paymentAllocations.organizationId, orgId)
      )
    );
  return { payment, allocations };
}
