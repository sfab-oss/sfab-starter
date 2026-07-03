import type {
  DepositCreditInput,
  RedeemCreditByReferenceInput,
  RedeemCreditInput,
} from "@workspace/contract/transaction";
import { createId, db } from "@workspace/db";
import type { CustomerCredit, Document } from "@workspace/db/schema";
import {
  activityLog,
  customerCredit,
  documents,
  entities,
  paymentAllocations,
  payments,
} from "@workspace/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { DomainError } from "../errors";
import { documentFamily } from "./family";
import {
  derivePaymentStatus,
  docProjectionUpdate,
  entityBalanceUpdate,
} from "./projections";

/**
 * Customer-credit wallet — deposits, redemptions, and walk-in claims (§4).
 *
 * The wallet is an **append-only ledger** of signed amounts. Positive rows
 * (deposit, overpay, store_credit, claim) increase credit; negative rows
 * (redemption, correction) decrease it. `entity.creditBalance` is a rebuilt
 * projection: `SUM(amount)` across all rows for that entity. Corrections are
 * **compensating rows** — never UPDATE in place.
 *
 * **Conservation (C1, full form):** a deposit lands **only** in the wallet,
 * never also as an AR allocation. Redemption debits the wallet AND allocates
 * to a document in one atomic `db.batch()`.
 *
 * **Walk-in matching (C3):** a walk-in deposit writes a `reference` (claim
 * token) with `entityId = null`. Later redemption by reference writes a
 * `claim` row (transferring credit into the entity's scope) + a `redemption`
 * row, so the entity's `creditBalance` nets correctly.
 *
 * @see docs/architecture/transaction-core.md §4
 */

type BatchStmt = Parameters<typeof db.batch>[0][number];

function runBatch(stmts: BatchStmt[]) {
  return db.batch(stmts as [BatchStmt, ...BatchStmt[]]);
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function validateRedemptionTarget(doc: Document, amount: number): void {
  const family = documentFamily(doc.type);
  if (family !== "fiscal") {
    throw new DomainError(
      `Wallet redemption may target fiscal documents only — "${doc.id}" is a ${family} document`,
      "unprocessable"
    );
  }
  if (doc.status !== "finalized") {
    throw new DomainError(
      `Target document must be finalized — "${doc.id}" is ${doc.status}`,
      "conflict"
    );
  }
  if (doc.direction !== "sales") {
    throw new DomainError(
      "Wallet redemption may only target sales documents, not purchase bills",
      "unprocessable"
    );
  }
  if (amount > doc.balanceDue) {
    throw new DomainError(
      `Redemption amount ${amount} exceeds document balance due ${doc.balanceDue}`,
      "conflict"
    );
  }
}

function willCompleteSale(doc: Document, amount: number): boolean {
  if (doc.direction !== "sales" || doc.type === "credit_note") {
    return false;
  }
  if (doc.paymentStatus === "paid") {
    return false;
  }
  return derivePaymentStatus(doc.amountPaid + amount, doc.total) === "paid";
}

// ---------------------------------------------------------------------------
// depositCredit
// ---------------------------------------------------------------------------

export interface DepositCreditResult {
  entryId: string;
  paymentId: string;
}

/**
 * Deposit credit to the wallet. Creates a payment header (audit trail — cash
 * received, no AR allocation) + a positive `customer_credit` row + entity
 * projection update, all in one `db.batch()`.
 *
 * For walk-ins (`entityId = null`), a `reference` (claim token) is required.
 */
export async function depositCredit(
  orgId: string,
  input: DepositCreditInput,
  opts: { actorId?: string } = {}
): Promise<DepositCreditResult> {
  if (!(input.entityId || input.reference)) {
    throw new DomainError(
      "Walk-in deposits require a reference (claim token)",
      "unprocessable"
    );
  }

  const now = new Date().toISOString();
  const paymentId = createId("pmt");
  const entryId = createId("cred");

  const stmts: BatchStmt[] = [];

  stmts.push(
    db.insert(payments).values({
      id: paymentId,
      organizationId: orgId,
      amount: input.amount,
      method: input.method ?? "deposit",
      paidAt: input.paidAt ?? now,
      reference: input.reference ?? null,
      idempotencyKey: input.idempotencyKey ?? null,
      entityId: input.entityId ?? null,
    })
  );

  stmts.push(
    db.insert(customerCredit).values({
      id: entryId,
      organizationId: orgId,
      entityId: input.entityId ?? null,
      amount: input.amount,
      type: input.type ?? "deposit",
      paymentId,
      reference: input.reference ?? null,
      notes: input.notes ?? null,
    })
  );

  if (input.entityId) {
    stmts.push(entityBalanceUpdate(input.entityId, orgId, now));
  }

  await runBatch(stmts);

  await db.insert(activityLog).values({
    organizationId: orgId,
    kind: "event",
    eventType: "credit_deposited",
    entityType: input.entityId ? "entity" : "payment",
    entityId: input.entityId ?? paymentId,
    actorId: opts.actorId ?? null,
    summary: `Credit deposited: ${input.amount}`,
    metadata: {
      amount: input.amount,
      type: input.type,
      entryId,
      reference: input.reference ?? null,
    },
    createdAt: now,
  });

  return { entryId, paymentId };
}

// ---------------------------------------------------------------------------
// redeemCredit
// ---------------------------------------------------------------------------

export interface RedeemCreditResult {
  paymentId: string;
  entryId: string;
  touchedDocuments: string[];
  completedSales: string[];
}

/**
 * Redeem wallet credit against a document. Debits the wallet (negative
 * `customer_credit` row) AND allocates to the target document (payment +
 * allocation) in one atomic `db.batch()`. The entity's `creditBalance` and
 * the document's payment projections are updated in the same batch.
 */
export async function redeemCredit(
  orgId: string,
  input: RedeemCreditInput,
  opts: { actorId?: string } = {}
): Promise<RedeemCreditResult> {
  const [entity] = await db
    .select()
    .from(entities)
    .where(
      and(eq(entities.id, input.entityId), eq(entities.organizationId, orgId))
    );
  if (!entity) {
    throw new DomainError(`Entity not found: ${input.entityId}`, "not_found");
  }
  if (entity.creditBalance < input.amount) {
    throw new DomainError(
      `Insufficient credit balance: ${entity.creditBalance} < ${input.amount}`,
      "conflict"
    );
  }

  const [doc] = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.id, input.documentId),
        eq(documents.organizationId, orgId)
      )
    );
  if (!doc) {
    throw new DomainError(
      `Document not found: ${input.documentId}`,
      "not_found"
    );
  }

  validateRedemptionTarget(doc, input.amount);
  const completedSale = willCompleteSale(doc, input.amount);

  const now = new Date().toISOString();
  const paymentId = createId("pmt");
  const entryId = createId("cred");

  const stmts: BatchStmt[] = [
    db.insert(payments).values({
      id: paymentId,
      organizationId: orgId,
      amount: input.amount,
      method: "wallet",
      paidAt: now,
      entityId: input.entityId,
    }),
    db.insert(customerCredit).values({
      id: entryId,
      organizationId: orgId,
      entityId: input.entityId,
      amount: -input.amount,
      type: "redemption",
      paymentId,
    }),
    db.insert(paymentAllocations).values({
      id: createId("alloc"),
      organizationId: orgId,
      paymentId,
      documentId: input.documentId,
      amount: input.amount,
      effectiveAt: now,
    }),
    docProjectionUpdate(input.documentId, orgId, now, paymentId),
    entityBalanceUpdate(input.entityId, orgId, now),
  ];

  await runBatch(stmts);

  const completedSales = completedSale ? [input.documentId] : [];
  await runBatch(
    buildWalletEventStmts(
      orgId,
      paymentId,
      entryId,
      input.entityId,
      input.amount,
      input.documentId,
      completedSales,
      opts.actorId,
      now,
      "credit_redeemed"
    )
  );

  return {
    paymentId,
    entryId,
    touchedDocuments: [input.documentId],
    completedSales,
  };
}

// ---------------------------------------------------------------------------
// redeemCreditByReference (walk-in C3)
// ---------------------------------------------------------------------------

/**
 * Redeem walk-in credit by presenting the claim-reference token. Writes a
 * `claim` row (transfers credit from walk-in scope into the entity's scope) +
 * a `redemption` row (consumes it) + payment allocation to the document, all
 * in one atomic batch.
 *
 * Double-claim prevention: a pre-check rejects if a `claim` row already exists
 * for the reference (TOCTOU accepted per D1 constraints; the correctness
 * backstop is the full-scan rebuild).
 */
export async function redeemCreditByReference(
  orgId: string,
  input: RedeemCreditByReferenceInput,
  opts: { actorId?: string } = {}
): Promise<RedeemCreditResult> {
  const walkInEntries = await db
    .select()
    .from(customerCredit)
    .where(
      and(
        eq(customerCredit.organizationId, orgId),
        eq(customerCredit.reference, input.reference),
        isNull(customerCredit.entityId)
      )
    );

  if (walkInEntries.length === 0) {
    throw new DomainError(
      `No walk-in credit found for reference: ${input.reference}`,
      "not_found"
    );
  }

  const walkInTotal = walkInEntries
    .filter((e) => e.amount > 0)
    .reduce((sum, e) => sum + e.amount, 0);

  const [existingClaim] = await db
    .select({ id: customerCredit.id })
    .from(customerCredit)
    .where(
      and(
        eq(customerCredit.organizationId, orgId),
        eq(customerCredit.reference, input.reference),
        eq(customerCredit.type, "claim")
      )
    );
  if (existingClaim) {
    throw new DomainError(
      `Reference "${input.reference}" has already been claimed`,
      "conflict"
    );
  }

  if (walkInTotal < input.amount) {
    throw new DomainError(
      `Insufficient walk-in credit for reference "${input.reference}": ${walkInTotal} < ${input.amount}`,
      "conflict"
    );
  }

  const [entity] = await db
    .select()
    .from(entities)
    .where(
      and(eq(entities.id, input.entityId), eq(entities.organizationId, orgId))
    );
  if (!entity) {
    throw new DomainError(`Entity not found: ${input.entityId}`, "not_found");
  }

  const [doc] = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.id, input.documentId),
        eq(documents.organizationId, orgId)
      )
    );
  if (!doc) {
    throw new DomainError(
      `Document not found: ${input.documentId}`,
      "not_found"
    );
  }

  validateRedemptionTarget(doc, input.amount);
  const completedSale = willCompleteSale(doc, input.amount);

  const now = new Date().toISOString();
  const paymentId = createId("pmt");
  const claimEntryId = createId("cred");
  const redemptionEntryId = createId("cred");

  const stmts: BatchStmt[] = [
    db.insert(payments).values({
      id: paymentId,
      organizationId: orgId,
      amount: input.amount,
      method: "wallet",
      paidAt: now,
      entityId: input.entityId,
    }),
    db.insert(customerCredit).values({
      id: claimEntryId,
      organizationId: orgId,
      entityId: input.entityId,
      amount: input.amount,
      type: "claim",
      reference: input.reference,
    }),
    db.insert(customerCredit).values({
      id: redemptionEntryId,
      organizationId: orgId,
      entityId: input.entityId,
      amount: -input.amount,
      type: "redemption",
      paymentId,
    }),
    db.insert(paymentAllocations).values({
      id: createId("alloc"),
      organizationId: orgId,
      paymentId,
      documentId: input.documentId,
      amount: input.amount,
      effectiveAt: now,
    }),
    docProjectionUpdate(input.documentId, orgId, now, paymentId),
    entityBalanceUpdate(input.entityId, orgId, now),
  ];

  await runBatch(stmts);

  const completedSales = completedSale ? [input.documentId] : [];
  await runBatch(
    buildWalletEventStmts(
      orgId,
      paymentId,
      redemptionEntryId,
      input.entityId,
      input.amount,
      input.documentId,
      completedSales,
      opts.actorId,
      now,
      "credit_redeemed"
    )
  );

  return {
    paymentId,
    entryId: redemptionEntryId,
    touchedDocuments: [input.documentId],
    completedSales,
  };
}

// ---------------------------------------------------------------------------
// reverseCreditEntry
// ---------------------------------------------------------------------------

/**
 * Reverse a wallet entry by writing a **compensating row** (never UPDATE in
 * place). The compensating row carries the negated amount.
 */
export async function reverseCreditEntry(
  entryId: string,
  orgId: string,
  opts: { actorId?: string; reason?: string } = {}
): Promise<{ reversalEntryId: string }> {
  const [entry] = await db
    .select()
    .from(customerCredit)
    .where(
      and(
        eq(customerCredit.id, entryId),
        eq(customerCredit.organizationId, orgId)
      )
    );
  if (!entry) {
    throw new DomainError(`Credit entry not found: ${entryId}`, "not_found");
  }

  const now = new Date().toISOString();
  const reversalId = createId("cred");

  const stmts: BatchStmt[] = [
    db.insert(customerCredit).values({
      id: reversalId,
      organizationId: orgId,
      entityId: entry.entityId,
      amount: -entry.amount,
      type: "correction",
      reference: entry.reference,
      notes: opts.reason ?? `Reversal of ${entryId}`,
    }),
  ];

  if (entry.entityId) {
    stmts.push(entityBalanceUpdate(entry.entityId, orgId, now));
  }

  await runBatch(stmts);

  return { reversalEntryId: reversalId };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function listCreditEntries(
  orgId: string,
  filter?: { entityId?: string }
): Promise<CustomerCredit[]> {
  const conditions = [eq(customerCredit.organizationId, orgId)];
  if (filter?.entityId) {
    conditions.push(eq(customerCredit.entityId, filter.entityId));
  }
  return await db
    .select()
    .from(customerCredit)
    .where(and(...conditions))
    .orderBy(sql`${customerCredit.createdAt} DESC`);
}

export async function getCreditBalance(
  entityId: string,
  orgId: string
): Promise<number> {
  const [row] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${customerCredit.amount}), 0)`.as(
        "total"
      ),
    })
    .from(customerCredit)
    .where(
      and(
        eq(customerCredit.organizationId, orgId),
        eq(customerCredit.entityId, entityId)
      )
    );
  return row?.total ?? 0;
}

// ---------------------------------------------------------------------------
// Event-log helper
// ---------------------------------------------------------------------------

function buildWalletEventStmts(
  orgId: string,
  paymentId: string,
  entryId: string,
  entityId: string,
  amount: number,
  documentId: string,
  completedSales: string[],
  actorId: string | undefined,
  now: string,
  eventType: string
): BatchStmt[] {
  const stmts: BatchStmt[] = completedSales.map((docId) =>
    db.insert(activityLog).values({
      organizationId: orgId,
      kind: "event",
      eventType: "sale_completed",
      entityType: "document",
      entityId: docId,
      actorId: actorId ?? null,
      summary: "Sale completed (paid from wallet)",
      createdAt: now,
    })
  );
  stmts.push(
    db.insert(activityLog).values({
      organizationId: orgId,
      kind: "event",
      eventType,
      entityType: "entity",
      entityId,
      actorId: actorId ?? null,
      summary: `Credit redeemed: ${amount}`,
      metadata: { amount, documentId, entryId, paymentId },
      createdAt: now,
    })
  );
  return stmts;
}
