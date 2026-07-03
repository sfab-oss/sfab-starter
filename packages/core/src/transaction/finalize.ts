import { db } from "@workspace/db";
import {
  activityLog,
  documents,
  lineItems,
  sequences,
} from "@workspace/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { DomainError } from "../errors";
import { assertCanFinalize, assertHasLines } from "./guards";
import { computeDocumentTotals, type DocumentTotals } from "./totals";

/**
 * Folio-atomic finalize — the load-bearing write of the hub (AC-9, C5).
 *
 * Freezes a fiscal document: bumps its folio, freezes its fiscal lines/totals/
 * tax/identity, sets the payment projection defaults, snapshots the frozen tax
 * context into `metadata.tax`, and writes the `document_finalized` event — all
 * in **one `db.batch()`** so the folio bump and the freeze commit or roll back
 * together. Payment/posting columns may advance later (C5); the frozen totals
 * may not.
 *
 * D1 has no interactive transactions, so atomicity is the single batch; reads
 * happen before assembly. The folio is assigned **inside** the batch via a
 * subquery against `sequences` (read+assign+increment in one atomic unit), so
 * concurrent finalizes cannot draw a duplicate folio. The freeze UPDATE also
 * requires `status = 'draft'` — if a concurrent finalize wins, the loser's
 * UPDATE matches zero rows, RETURNING is empty, and we throw a conflict. The
 * residual cost is one burned sequence number (the bump runs unconditionally).
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
  opts: { actorId?: string } = {}
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

  const now = new Date().toISOString();
  const postingDate = doc.postingDate ?? now;

  // Folio key is open (per series/type); default to the type.
  const seqKey = doc.series ?? doc.type;

  // Frozen tax context snapshot (§3) — what an engine / fiscal Base needs.
  const metadata = {
    ...(doc.metadata ?? {}),
    tax: {
      currencyCode: doc.currencyCode,
      taxMode: lines[0]?.taxMode ?? "exclusive",
      taxableBase: totals.taxableBase,
      taxTotal: totals.taxTotal, // excludes withholdings (none in base)
      computedAt: now,
    },
  };

  // 3. ASSEMBLE the atomic batch.
  // (a) ensure the sequence row exists; (b) freeze the doc + assign folio via
  //     an in-batch subquery (race-free); (c) increment the counter; (d) write
  //     the event row.
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

  const insertEvent = db.insert(activityLog).values({
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

  // SEAM marker: a pack (ALW-350) appends critical statements (e.g. the stock
  // decrement) into this array so they commit or roll back WITH the finalize.
  // The afterCommit posting seam (C7) is this batch's commit itself — a GL
  // pack subscribes by appending in-batch statements, not via a post-batch
  // hook (there is no base consumer; the event row serves timeline + log).
  const [, frozen] = await db.batch([
    ensureSeq,
    freezeDoc,
    bumpSeq,
    insertEvent,
  ]);

  // 4. read the folio the subquery assigned (from the batch result — no
  //    extra round-trip; the batch committed or we threw).
  const folio = frozen[0]?.folio;
  if (folio == null) {
    // Empty RETURNING means the status='draft' guard didn't match — another
    // request finalized this document between our read and the batch.
    throw new DomainError(
      `Document ${documentId} was already finalized (or no longer draft)`,
      "conflict"
    );
  }
  return { documentId, folio, totals };
}
