import type { RecordPaymentInput } from "@workspace/contract/transaction";
import { createId, db } from "@workspace/db";
import type { Document, Payment } from "@workspace/db/schema";
import {
  activityLog,
  documents,
  paymentAllocations,
  payments,
} from "@workspace/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { DomainError } from "../errors";
import { documentFamily } from "./family";
import {
  derivePaymentStatus,
  docProjectionUpdate,
  entityBalanceUpdate,
} from "./projections";

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
 * allocations. The original rows remain in place and the negated compensating
 * rows cancel them in every SUM — projection correctness comes from the math,
 * not from a `WHERE reversed_at IS NULL` filter. `reversedAt` on the original
 * rows is an audit marker only.
 *
 * @see docs/architecture/transaction-core.md §4
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type BatchStmt = Parameters<typeof db.batch>[0][number];
export type { BatchStmt };

/** Run a batch of statements (typed wrapper to avoid repeating the tuple cast). */
export function runBatch(stmts: BatchStmt[]) {
  return db.batch(stmts as [BatchStmt, ...BatchStmt[]]);
}

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

/**
 * Look up a payment by its idempotency key. Shared by the payment replay path
 * and the wallet-deposit replay path (both key off `payments_org_idem_uniq`).
 */
export async function findPaymentByIdempotencyKey(
  orgId: string,
  idempotencyKey: string
): Promise<{ id: string; amount: number } | null> {
  const [existing] = await db
    .select({ id: payments.id, amount: payments.amount })
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, orgId),
        eq(payments.idempotencyKey, idempotencyKey)
      )
    );
  return existing ?? null;
}

/**
 * Does this batch error come from the `payments_org_idem_uniq` UNIQUE
 * constraint firing (a concurrent first-time request that raced past the
 * pre-check)? Shared so the constraint-name coupling lives in one place.
 */
export function isIdempotencyKeyConflict(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("idempotency_key") && msg.includes("UNIQUE");
}

/**
 * Fetch the existing payment for an idempotency-key replay, validate the
 * request amount matches, and return the stored payment's touched documents.
 * Called both from the pre-check (happy-path retry) and from the batch catch
 * handler (concurrent race loser — F2/F3).
 *
 * `completedSales` is always `[]` on a replay: the events were already written
 * by the original call, and we must not fire duplicate `sale_completed`.
 */
async function replayIdempotentPayment(
  orgId: string,
  idempotencyKey: string,
  inputAmount: number
): Promise<RecordPaymentResult | null> {
  const existing = await findPaymentByIdempotencyKey(orgId, idempotencyKey);
  if (!existing) {
    return null;
  }

  if (existing.amount !== inputAmount) {
    throw new DomainError(
      `Idempotency key "${idempotencyKey}" is already used for a payment of amount ${existing.amount}, cannot reuse for amount ${inputAmount}`,
      "conflict"
    );
  }

  const allocations = await db
    .select({ documentId: paymentAllocations.documentId })
    .from(paymentAllocations)
    .where(
      and(
        eq(paymentAllocations.organizationId, orgId),
        eq(paymentAllocations.paymentId, existing.id)
      )
    );

  return {
    paymentId: existing.id,
    touchedDocuments: allocations.map((a) => a.documentId),
    completedSales: [],
  };
}

/**
 * Handle a batch conflict: if the UNIQUE constraint on idempotency_key fired
 * (concurrent race past the pre-check — F2), re-read and return the existing
 * payment; otherwise rethrow.
 */
async function catchIdempotentRace(
  err: unknown,
  orgId: string,
  idempotencyKey: string | null | undefined,
  inputAmount: number
): Promise<RecordPaymentResult> {
  if (idempotencyKey && isIdempotencyKeyConflict(err)) {
    const replay = await replayIdempotentPayment(
      orgId,
      idempotencyKey,
      inputAmount
    );
    if (replay) {
      return replay;
    }
  }
  throw err;
}

/** Build the post-batch event-log batch statements (best-effort writes). */
function buildPaymentEventStmts(
  orgId: string,
  paymentId: string,
  input: RecordPaymentInput,
  completedSales: string[],
  actorId: string | undefined,
  now: string
): BatchStmt[] {
  const stmts: BatchStmt[] = completedSales.map((docId) =>
    db.insert(activityLog).values({
      organizationId: orgId,
      kind: "event",
      eventType: "sale_completed",
      entityType: "document",
      entityId: docId,
      actorId: actorId ?? null,
      summary: "Sale completed (fully paid)",
      createdAt: now,
    })
  );
  stmts.push(
    db.insert(activityLog).values({
      organizationId: orgId,
      kind: "event",
      eventType: "payment_recorded",
      entityType: "payment",
      entityId: paymentId,
      actorId: actorId ?? null,
      summary: `Payment recorded: ${input.method}`,
      metadata: {
        amount: input.amount,
        method: input.method,
        allocations: input.allocations.length,
      },
      createdAt: now,
    })
  );
  return stmts;
}

/**
 * Detect which docs will transition to "paid" from this payment's allocations.
 * Only **sales receivables** (not credit notes, not purchase bills) qualify —
 * `sale_completed` is a sales-domain event (§7); paying a supplier bill or
 * settling a credit note must not fire it.
 */
function detectNewlyCompletedSales(
  docs: Document[],
  allocations: RecordPaymentInput["allocations"]
): string[] {
  const allocSums = new Map<string, number>();
  for (const a of allocations) {
    allocSums.set(a.documentId, (allocSums.get(a.documentId) ?? 0) + a.amount);
  }
  const completed: string[] = [];
  for (const doc of docs) {
    if (doc.direction !== "sales" || doc.type === "credit_note") {
      continue;
    }
    if (doc.paymentStatus === "paid") {
      continue;
    }
    const newAmountPaid = doc.amountPaid + (allocSums.get(doc.id) ?? 0);
    if (derivePaymentStatus(newAmountPaid, doc.total) === "paid") {
      completed.push(doc.id);
    }
  }
  return completed;
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
  opts: {
    actorId?: string;
    docs?: Document[];
    paymentId?: string;
    extraStmts?: BatchStmt[];
  } = {}
): Promise<RecordPaymentResult> {
  // 1. READ: validate all target documents are fiscal + finalized.
  const docIds = [...new Set(input.allocations.map((a) => a.documentId))];
  if (docIds.length !== input.allocations.length) {
    throw new DomainError(
      "Duplicate documentId in allocations — a payment may have at most one allocation per document",
      "unprocessable"
    );
  }

  // When opts.docs is provided (e.g. credit-note disposition), skip the
  // redundant DB round-trip and use the pre-fetched rows directly.
  const docs = opts.docs
    ? opts.docs.filter((d) => docIds.includes(d.id))
    : await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.organizationId, orgId),
            inArray(documents.id, docIds)
          )
        );

  if (docs.length !== docIds.length) {
    throw new DomainError(
      "One or more target documents not found",
      "not_found"
    );
  }

  validateAllocationTargets(docs);
  const completedSales = detectNewlyCompletedSales(docs, input.allocations);

  // 2. IDEMPOTENCY: if a key is provided, return the existing payment.
  if (input.idempotencyKey) {
    const replay = await replayIdempotentPayment(
      orgId,
      input.idempotencyKey,
      input.amount
    );
    if (replay) {
      return replay;
    }
  }

  // 3. PRE-GENERATE IDs (so allocation rows reference the payment in-batch).
  const paymentId = opts.paymentId ?? createId("pmt");
  const now = new Date().toISOString();
  const paidAt = input.paidAt ?? now;

  // 4. ASSEMBLE the batch: payment + allocations + projection updates.
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

  // (d) Companion statements from the caller (e.g. wallet debit/deposit rows)
  //     — they ride in the same atomic batch so the payment + wallet mutation
  //     commit or roll back together. They run BEFORE the entity projection
  //     update so entityBalanceUpdate's full-scan credit subquery sees them.
  if (opts.extraStmts) {
    stmts.push(...opts.extraStmts);
  }

  // (e) Entity balance updates — for every entity that owns an allocated doc.
  // Derived from the documents, not input.entityId, so balance stays correct
  // even when the caller omits entityId (e.g. the demo RecordPaymentForm).
  const entityIds = [
    ...new Set(docs.map((d) => d.entityId).filter(Boolean)),
  ] as string[];
  for (const eid of entityIds) {
    stmts.push(entityBalanceUpdate(eid, orgId, now));
  }

  // 5. EXECUTE — one atomic batch. If a concurrent first-time request with
  //    the same idempotency key raced past the pre-check, the
  //    payments_org_idem_uniq UNIQUE constraint fires here; the catch handler
  //    re-reads and returns the existing payment instead of a raw 500 (F2).
  try {
    await runBatch(stmts);
  } catch (err) {
    return catchIdempotentRace(err, orgId, input.idempotencyKey, input.amount);
  }

  // 6. POST-BATCH events (best-effort, same pattern as finalize).
  await runBatch(
    buildPaymentEventStmts(
      orgId,
      paymentId,
      input,
      completedSales,
      opts.actorId,
      now
    )
  );

  return { paymentId, touchedDocuments: docIds, completedSales };
}

// ---------------------------------------------------------------------------
// reversePayment
// ---------------------------------------------------------------------------

/**
 * Reverse a payment by writing **compensating rows** (C6): a reversal payment
 * header with negated amount + negated allocation rows. The original
 * allocations are NOT deleted — the negated compensating rows cancel them in
 * every SUM, so projections stay correct without filtering on `reversedAt`.
 *
 * `reversedAt` is written on the originals as an **audit marker** (display/
 * traceability); it is never used as a projection filter. Double-reversal is
 * prevented by the payment-level guard (checks for an existing reversal row),
 * not by per-allocation state.
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

  // Select all allocations of the original payment — the payment-level guard
  // above already ensures this payment has no existing reversal, so every row
  // is live. No `isNull(reversedAt)` needed.
  const allocations = await db
    .select()
    .from(paymentAllocations)
    .where(
      and(
        eq(paymentAllocations.paymentId, paymentId),
        eq(paymentAllocations.organizationId, orgId)
      )
    );

  // Read entityIds of the touched documents for balance updates.
  const touchedDocRows = allocations.length
    ? await db
        .select({ entityId: documents.entityId })
        .from(documents)
        .where(
          and(
            eq(documents.organizationId, orgId),
            inArray(
              documents.id,
              allocations.map((a) => a.documentId)
            )
          )
        )
    : [];

  // 2. PRE-GENERATE IDs.
  const reversalPaymentId = createId("pmt");
  const now = new Date().toISOString();
  const touchedDocIds = new Set<string>();

  // 3. ASSEMBLE the batch.
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

  // (c) Document projection updates.
  for (const docId of touchedDocIds) {
    stmts.push(docProjectionUpdate(docId, orgId, now));
  }

  // (d) Entity balance updates — for every entity that owns a reversed doc.
  const entityIds = [
    ...new Set(touchedDocRows.map((d) => d.entityId).filter(Boolean)),
  ] as string[];
  for (const eid of entityIds) {
    stmts.push(entityBalanceUpdate(eid, orgId, now));
  }

  // 4. EXECUTE. The unique index on (org_id, reverses_payment_id) is the
  //    last-line defense against concurrent double-reversal: if two calls
  //    race past the pre-check, the batch fails atomically here.
  try {
    await runBatch(stmts);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("reverses_payment_id") && msg.includes("UNIQUE")) {
      throw new DomainError("Payment already reversed", "conflict");
    }
    throw err;
  }

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
