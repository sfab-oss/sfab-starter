import { db } from "@workspace/db";
import {
  activityLog,
  documents,
  entities,
  lineItems,
  sequences,
} from "@workspace/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { DomainError } from "../errors";
import { assertCanFinalize, assertHasLines } from "./guards";
import { derivePaymentStatus, entityBalanceUpdate } from "./projections";
import { computeDocumentTotals, type DocumentTotals } from "./totals";

/**
 * Folio-atomic finalize — the load-bearing write of the hub (AC-9, C5).
 *
 * Freezes a fiscal document: bumps its folio, freezes its fiscal lines/totals/
 * tax/identity, sets the payment projection defaults, snapshots the frozen tax
 * context into `metadata.tax`, and writes the `document_finalized` event.
 *
 * **Atomicity:** the batch `[ensureSeq, freezeDoc, bumpSeq]` is the atomic
 * folio-assignment unit — it commits or rolls back together. The event row is
 * written *after* the batch commits and the folio is verified, so a losing
 * concurrent finalize never produces a phantom `document_finalized` event.
 *
 * D1 has no interactive transactions. The folio is assigned **inside** the
 * batch via a subquery against `sequences` (read+assign+increment in one atomic
 * unit), so concurrent finalizes cannot draw a duplicate folio. The freeze
 * UPDATE also requires `status = 'draft'` — if a concurrent finalize wins, the
 * loser's UPDATE matches zero rows, RETURNING is empty, and we throw a
 * conflict. The residual cost is one burned sequence number (the bump runs
 * unconditionally in the batch).
 *
 * @see docs/architecture/transaction-core.md §2, §5, §7
 */
export interface FinalizeResult {
  documentId: string;
  folio: number;
  totals: DocumentTotals;
}

export async function finalizeDocument(
  documentId: string,
  orgId: string,
  opts: { actorId?: string; bypassCreditLimit?: boolean } = {}
): Promise<FinalizeResult> {
  // 1. READ (before batch assembly).
  const [doc] = await db
    .select()
    .from(documents)
    .where(
      and(eq(documents.id, documentId), eq(documents.organizationId, orgId))
    );
  if (!doc) {
    throw new DomainError(`Document not found: ${documentId}`, "not_found");
  }

  const family = assertCanFinalize(doc);

  const lines = await db
    .select()
    .from(lineItems)
    .where(
      and(
        eq(lineItems.documentId, documentId),
        eq(lineItems.organizationId, orgId)
      )
    )
    .orderBy(lineItems.createdAt);
  assertHasLines(lines, documentId);

  // 2. COMPUTE totals — round per line; header = exact Σ (§3).
  const totals = computeDocumentTotals(lines);

  // Credit-limit enforcement (§8): if this is a sales-fiscal doc with an
  // entity that has a creditLimit, check the projected AR balance after this
  // document's total lands. The `credit:bypass` RBAC key lets an admin
  // override (the route layer checks can("credit:bypass") and passes the flag).
  if (doc.direction === "sales" && doc.entityId && !opts.bypassCreditLimit) {
    await assertWithinCreditLimit(doc.entityId, orgId, totals.total);
  }

  const now = new Date().toISOString();
  const postingDate = doc.postingDate ?? now;

  // Folio key is open (per series/type); default to the type.
  const seqKey = doc.series ?? doc.type;

  // Frozen tax context snapshot (§3) — what an engine / fiscal Base needs.
  // taxMode is per-line (each line_items row carries its own); the doc snapshot
  // records the aggregate amounts, not a single mode.
  const metadata = {
    ...(doc.metadata ?? {}),
    tax: {
      currencyCode: doc.currencyCode,
      taxableBase: totals.taxableBase,
      taxTotal: totals.taxTotal, // excludes withholdings (none in base)
      computedAt: now,
    },
  };

  // 3. ASSEMBLE the atomic batch — folio assignment + freeze.
  // (a) ensure the sequence row exists; (b) freeze the doc + assign folio via
  //     an in-batch subquery (race-free); (c) increment the counter.
  const ensureSeq = db
    .insert(sequences)
    .values({ organizationId: orgId, key: seqKey, next: 1 })
    .onConflictDoNothing();

  const freezeDoc = db
    .update(documents)
    .set({
      status: "finalized",
      folio: sql`(SELECT next FROM sequences WHERE organization_id = ${orgId} AND key = ${seqKey})`,
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      taxTotal: totals.taxTotal, // excludes withholdings
      total: totals.total,
      balanceDue: totals.total, // projection default: no payments yet
      paymentStatus: derivePaymentStatus(0, totals.total),
      issuedAt: doc.issuedAt ?? now,
      postingDate,
      metadata,
      updatedAt: now,
    })
    .where(
      and(
        eq(documents.id, documentId),
        eq(documents.organizationId, orgId),
        eq(documents.status, "draft")
      )
    )
    .returning({ folio: documents.folio });

  const bumpSeq = db
    .update(sequences)
    .set({ next: sql`next + 1`, updatedAt: now })
    .where(and(eq(sequences.organizationId, orgId), eq(sequences.key, seqKey)));

  // SEAM marker: a pack (ALW-350) appends critical statements (e.g. the stock
  // decrement) into this array so they commit or roll back WITH the finalize.
  const [, frozen] = await db.batch([ensureSeq, freezeDoc, bumpSeq]);

  // 4. Verify the freeze won — empty RETURNING means a concurrent finalize
  //    beat us (the status='draft' guard didn't match).
  const folio = frozen[0]?.folio;
  if (folio == null) {
    throw new DomainError(
      `Document ${documentId} was already finalized (or no longer draft)`,
      "conflict"
    );
  }

  // 4b. Update the entity's AR balance so the credit-limit check (§8) on the
  //     NEXT finalize sees this document. Same post-batch pattern as the event
  //     log below — a crash here is repairable via rebuildEntityBalance.
  if (doc.entityId) {
    await entityBalanceUpdate(doc.entityId, orgId, now);
  }

  // 5. Write the event row AFTER the batch commits and the folio is verified.
  //    This guarantees no phantom `document_finalized` event for a losing
  //    concurrent finalize. A crash between batch and event loses the row —
  //    acceptable, since a missing event is far less harmful than a wrong one.
  await db.insert(activityLog).values({
    organizationId: orgId,
    kind: "event",
    eventType: "document_finalized",
    entityType: "document",
    entityId: documentId,
    actorId: opts.actorId ?? null,
    summary: `${doc.type} finalized`,
    metadata: {
      total: totals.total,
      currencyCode: doc.currencyCode,
      family,
    },
    createdAt: now,
  });

  return { documentId, folio, totals };
}

/**
 * Check that finalizing a document with `additionalAmount` won't push the
 * entity's AR balance over their creditLimit (§8). Throws a `conflict`
 * DomainError if exceeded. No-op if the entity has no creditLimit.
 */
async function assertWithinCreditLimit(
  entityId: string,
  orgId: string,
  additionalAmount: number
): Promise<void> {
  const [entity] = await db
    .select()
    .from(entities)
    .where(and(eq(entities.id, entityId), eq(entities.organizationId, orgId)));
  if (!entity || entity.creditLimit == null) {
    return;
  }

  const projectedBalance = entity.balance + additionalAmount;
  if (projectedBalance > entity.creditLimit) {
    throw new DomainError(
      `Credit limit exceeded for "${entity.name}": projected balance ${projectedBalance} exceeds limit ${entity.creditLimit}`,
      "conflict"
    );
  }
}
