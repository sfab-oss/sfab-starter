import type {
  DepositCreditInput,
  RedeemCreditByReferenceInput,
  RedeemCreditInput,
} from "@workspace/contract/transaction";
import { createId, db } from "@workspace/db";
import type { CustomerCredit } from "@workspace/db/schema";
import {
  activityLog,
  customerCredit,
  documents,
  entities,
  payments,
} from "@workspace/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { DomainError } from "../errors";
import { documentFamily } from "./family";
import {
  type BatchStmt,
  findPaymentByIdempotencyKey,
  isIdempotencyKeyConflict,
  recordPayment,
  runBatch,
} from "./payments";
import { entityBalanceUpdate } from "./projections";

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
 * to a document via `recordPayment` (the settlement engine) with companion
 * wallet statements in the same atomic batch — no duplicated engine logic.
 *
 * **Walk-in matching (C3):** a walk-in deposit writes a `reference` (claim
 * token) with `entityId = null`. Redemption by reference is a **balanced
 * transfer**: the full walk-in total is debited from the walk-in scope and
 * credited to the entity scope, then `input.amount` is redeemed as an ordinary
 * wallet redemption. The remainder stays as entity credit. Double-claim is
 * prevented by a UNIQUE index on `claim_reference` (set only on the walk-in
 * debit row; NULL for all others, and SQLite treats NULLs as distinct).
 *
 * @see docs/architecture/transaction-core.md §4
 */

export interface DepositCreditResult {
  entryId: string;
  paymentId: string;
}

/** Pre-check / replay an idempotent deposit (same pattern as recordPayment). */
async function replayIdempotentDeposit(
  orgId: string,
  key: string
): Promise<DepositCreditResult | null> {
  const existing = await findPaymentByIdempotencyKey(orgId, key);
  if (!existing) {
    return null;
  }
  const entry = await findCreditEntryByPaymentId(orgId, existing.id);
  return { entryId: entry ?? "", paymentId: existing.id };
}

/** Handle a batch UNIQUE constraint error from a concurrent deposit race. */
async function catchDepositRace(
  err: unknown,
  orgId: string,
  key: string | null | undefined
): Promise<DepositCreditResult> {
  if (key && isIdempotencyKeyConflict(err)) {
    const replay = await replayIdempotentDeposit(orgId, key);
    if (replay) {
      return replay;
    }
  }
  throw err;
}

/**
 * Deposit credit to the wallet. Creates a payment header (audit trail — cash
 * received, no AR allocation) + a positive `customer_credit` row + entity
 * projection update, all in one `db.batch()`.
 *
 * For walk-ins (`entityId = null`), a `reference` (claim token) is required.
 * Idempotency: if `idempotencyKey` is provided, a pre-check returns the
 * existing payment on retry, and the batch UNIQUE constraint is the
 * last-line race defense.
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

  if (input.idempotencyKey) {
    const replay = await replayIdempotentDeposit(orgId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
  }

  const now = new Date().toISOString();
  const paymentId = createId("pmt");
  const entryId = createId("cred");
  const stmts = buildDepositStmts(orgId, input, paymentId, entryId, now);

  try {
    await runBatch(stmts);
  } catch (err) {
    return catchDepositRace(err, orgId, input.idempotencyKey);
  }

  await logDepositEvent(orgId, paymentId, entryId, input, opts.actorId, now);

  return { entryId, paymentId };
}

function buildDepositStmts(
  orgId: string,
  input: DepositCreditInput,
  paymentId: string,
  entryId: string,
  now: string
): BatchStmt[] {
  const stmts: BatchStmt[] = [
    db.insert(payments).values({
      amount: input.amount,
      entityId: input.entityId ?? null,
      id: paymentId,
      idempotencyKey: input.idempotencyKey ?? null,
      method: input.method ?? "deposit",
      organizationId: orgId,
      paidAt: input.paidAt ?? now,
      reference: input.reference ?? null,
    }),
    db.insert(customerCredit).values({
      amount: input.amount,
      entityId: input.entityId ?? null,
      id: entryId,
      notes: input.notes ?? null,
      organizationId: orgId,
      paymentId,
      reference: input.reference ?? null,
      type: input.type ?? "deposit",
    }),
  ];
  if (input.entityId) {
    stmts.push(entityBalanceUpdate(input.entityId, orgId, now));
  }
  return stmts;
}

async function logDepositEvent(
  orgId: string,
  paymentId: string,
  entryId: string,
  input: DepositCreditInput,
  actorId: string | undefined,
  now: string
): Promise<void> {
  await db.insert(activityLog).values({
    actorId: actorId ?? null,
    createdAt: now,
    entityId: input.entityId ?? paymentId,
    entityType: input.entityId ? "entity" : "payment",
    eventType: "credit_deposited",
    kind: "event",
    metadata: {
      amount: input.amount,
      entryId,
      reference: input.reference ?? null,
      type: input.type ?? "deposit",
    },
    organizationId: orgId,
    summary: `Credit deposited: ${input.amount}`,
  });
}

export interface RedeemCreditResult {
  completedSales: string[];
  entryId: string;
  paymentId: string;
  touchedDocuments: string[];
}

/**
 * Redeem wallet credit against a document. Debits the wallet (negative
 * `customer_credit` row) AND allocates to the target document via
 * `recordPayment` — all in one atomic batch via `opts.extraStmts`.
 *
 * The entity's `creditBalance` projection is updated automatically by
 * `recordPayment`'s `entityBalanceUpdate` call (which includes the wallet
 * subquery).
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

  validateWalletTarget(doc, input.amount, input.entityId);

  const paymentId = createId("pmt");
  const entryId = createId("cred");

  const result = await recordPayment(
    orgId,
    {
      allocations: [{ amount: input.amount, documentId: input.documentId }],
      amount: input.amount,
      entityId: input.entityId,
      method: "wallet",
    },
    {
      actorId: opts.actorId,
      docs: [doc],
      extraStmts: [
        db.insert(customerCredit).values({
          amount: -input.amount,
          entityId: input.entityId,
          id: entryId,
          organizationId: orgId,
          paymentId,
          type: "redemption",
        }),
      ],
      paymentId,
    }
  );

  return {
    completedSales: result.completedSales,
    entryId,
    paymentId: result.paymentId,
    touchedDocuments: result.touchedDocuments,
  };
}

/**
 * Redeem walk-in credit by presenting the claim-reference token.
 *
 * **Balanced transfer model:** the **full** walk-in total is debited from
 * the walk-in scope (`entityId = null`) and credited to the entity scope.
 * Then `input.amount` is redeemed as an ordinary wallet redemption. The
 * remainder stays as entity credit, redeemable later via `redeemCredit`.
 *
 * This conserves globally (the walk-in debit cancels the deposit), supports
 * partial claims (the remainder is normal entity credit), and makes reversed
 * deposits unclaimable (the signed SUM nets to zero — no positive filter).
 *
 * Double-claim prevention: the walk-in debit row carries `claimReference =
 * reference`, and a UNIQUE index on `(org, claim_reference)` prevents a second
 * claim. SQLite treats NULLs as distinct in UNIQUE constraints, so only the
 * claim row (non-null `claimReference`) conflicts.
 */
export async function redeemCreditByReference(
  orgId: string,
  input: RedeemCreditByReferenceInput,
  opts: { actorId?: string } = {}
): Promise<RedeemCreditResult> {
  // One query for all entries with this reference — partition in JS.
  const refEntries = await db
    .select()
    .from(customerCredit)
    .where(
      and(
        eq(customerCredit.organizationId, orgId),
        eq(customerCredit.reference, input.reference)
      )
    );

  const walkInEntries = refEntries.filter((e) => e.entityId === null);
  const walkInTotal = walkInEntries.reduce((sum, e) => sum + e.amount, 0);
  const alreadyClaimed = walkInEntries.some((e) => e.type === "claim");

  if (alreadyClaimed) {
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

  validateWalletTarget(doc, input.amount, input.entityId);

  const paymentId = createId("pmt");
  const claimWalkInId = createId("cred");
  const claimEntityId = createId("cred");
  const redemptionEntryId = createId("cred");

  try {
    const result = await recordPayment(
      orgId,
      {
        allocations: [{ amount: input.amount, documentId: input.documentId }],
        amount: input.amount,
        entityId: input.entityId,
        method: "wallet",
      },
      {
        actorId: opts.actorId,
        docs: [doc],
        extraStmts: [
          // Balanced transfer: debit walk-in scope (claimReference set for
          // UNIQUE race prevention), credit entity scope.
          db.insert(customerCredit).values({
            amount: -walkInTotal,
            claimReference: input.reference,
            entityId: null,
            id: claimWalkInId,
            organizationId: orgId,
            reference: input.reference,
            type: "claim",
          }),
          db.insert(customerCredit).values({
            amount: walkInTotal,
            entityId: input.entityId,
            id: claimEntityId,
            organizationId: orgId,
            reference: input.reference,
            type: "claim",
          }),
          db.insert(customerCredit).values({
            amount: -input.amount,
            entityId: input.entityId,
            id: redemptionEntryId,
            organizationId: orgId,
            paymentId,
            type: "redemption",
          }),
        ],
        paymentId,
      }
    );

    return {
      completedSales: result.completedSales,
      entryId: redemptionEntryId,
      paymentId: result.paymentId,
      touchedDocuments: result.touchedDocuments,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("claim_reference") && msg.includes("UNIQUE")) {
      // DomainError forwards ErrorOptions via super; rule does not see subclass cause wiring.
      // biome-ignore lint/style/useErrorCause: DomainError accepts ErrorOptions.cause
      throw new DomainError(
        `Reference "${input.reference}" has already been claimed`,
        "conflict",
        { cause: err }
      );
    }
    throw err;
  }
}

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
      amount: -entry.amount,
      entityId: entry.entityId,
      id: reversalId,
      notes: opts.reason ?? `Reversal of ${entryId}`,
      organizationId: orgId,
      reference: entry.reference,
      type: "correction",
    }),
  ];

  if (entry.entityId) {
    stmts.push(entityBalanceUpdate(entry.entityId, orgId, now));
  }

  await runBatch(stmts);

  return { reversalEntryId: reversalId };
}

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

function validateWalletTarget(
  doc: typeof documents.$inferSelect,
  amount: number,
  entityId: string
): void {
  const family = documentFamily(doc.type);
  if (family !== "fiscal") {
    throw new DomainError(
      `Wallet redemption may target fiscal documents only — "${doc.id}" is a ${family} document`,
      "unprocessable"
    );
  }
  if (doc.direction !== "sales") {
    throw new DomainError(
      "Wallet redemption may only target sales documents, not purchase bills",
      "unprocessable"
    );
  }
  // The redeeming entity may only pay its OWN documents. Without this, a
  // redemption could debit entity A's wallet while `recordPayment` refreshes
  // only the target doc-owner's `creditBalance` projection, leaving A's cached
  // balance stale-high and over-redeemable.
  if (doc.entityId !== entityId) {
    throw new DomainError(
      `Wallet redemption may only target the redeeming entity's own documents — "${doc.id}" belongs to a different entity`,
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

async function findCreditEntryByPaymentId(
  orgId: string,
  paymentId: string
): Promise<string | null> {
  const [row] = await db
    .select({ id: customerCredit.id })
    .from(customerCredit)
    .where(
      and(
        eq(customerCredit.organizationId, orgId),
        eq(customerCredit.paymentId, paymentId)
      )
    );
  return row?.id ?? null;
}
