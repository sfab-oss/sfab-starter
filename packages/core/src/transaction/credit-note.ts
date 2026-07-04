import { createId, db } from "@workspace/db";
import type { CreditNoteDisposition, Document } from "@workspace/db/schema";
import { customerCredit, documents } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import { DomainError } from "../errors";
import { recordPayment } from "./payments";

/**
 * Credit-note disposition routing (§2, §4, §10).
 *
 * A finalized `credit_note` is a fiscal document whose `total` is negative
 * (it reverses value). The disposition determines how the credit is consumed:
 *
 * - **cash_refund** — cash is returned to the customer. Records a payment with
 *   `method: "cash_refund"` and a negative allocation against the credit note
 *   (settling its negative `balanceDue` to zero).
 *
 * - **apply_to_document** — the credit is applied against another document the
 *   customer owes. Records a zero-amount "credit" payment with two allocations:
 *   one settling the credit note, one reducing the target document's balance.
 *
 * - **store_credit** — the credit lands in the customer-credit wallet as
 *   `saldo a favor`. Settles the credit note and writes a positive
 *   `customer_credit` row via `recordPayment`'s `extraStmts` — one atomic
 *   batch for the payment, allocation, and wallet deposit.
 *
 * All three dispositions compose with `recordPayment` — no duplicated
 * settlement-engine logic.
 *
 * @see docs/architecture/transaction-core.md §2, §4, §10
 */

export interface CreditNoteDispositionResult {
  paymentId: string;
  disposition: CreditNoteDisposition;
}

export async function applyCreditNoteDisposition(
  creditNoteId: string,
  orgId: string,
  disposition: CreditNoteDisposition,
  opts: { targetDocumentId?: string; actorId?: string } = {}
): Promise<CreditNoteDispositionResult> {
  const [cn] = await db
    .select()
    .from(documents)
    .where(
      and(eq(documents.id, creditNoteId), eq(documents.organizationId, orgId))
    );
  if (!cn) {
    throw new DomainError(
      `Credit note not found: ${creditNoteId}`,
      "not_found"
    );
  }
  if (cn.type !== "credit_note") {
    throw new DomainError(
      `Document ${creditNoteId} is not a credit_note`,
      "unprocessable"
    );
  }
  if (cn.status !== "finalized") {
    throw new DomainError(
      `Credit note must be finalized before disposition (current: ${cn.status})`,
      "conflict"
    );
  }

  if (disposition === "store_credit") {
    if (!cn.entityId) {
      throw new DomainError(
        "Store-credit disposition requires the credit note to have an entityId",
        "unprocessable"
      );
    }

    return applyStoreCreditDisposition(cn, orgId, opts);
  }

  if (disposition === "cash_refund") {
    const result = await recordPayment(
      orgId,
      {
        amount: cn.total,
        method: "cash_refund",
        entityId: cn.entityId,
        allocations: [{ documentId: creditNoteId, amount: cn.total }],
      },
      { actorId: opts.actorId, docs: [cn] }
    );

    return { paymentId: result.paymentId, disposition };
  }

  if (disposition === "apply_to_document") {
    if (!opts.targetDocumentId) {
      throw new DomainError(
        "Target documentId required for apply-to-document disposition",
        "unprocessable"
      );
    }

    const [target] = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.id, opts.targetDocumentId),
          eq(documents.organizationId, orgId)
        )
      );
    if (!target) {
      throw new DomainError(
        `Target document not found: ${opts.targetDocumentId}`,
        "not_found"
      );
    }
    if (target.status !== "finalized") {
      throw new DomainError(
        `Target document must be finalized (current: ${target.status})`,
        "conflict"
      );
    }
    if (target.entityId !== cn.entityId) {
      throw new DomainError(
        "Target document must belong to the same entity as the credit note",
        "unprocessable"
      );
    }
    if (target.direction !== "sales") {
      throw new DomainError(
        "Credit notes may only be applied to sales documents, not purchase bills",
        "unprocessable"
      );
    }

    const result = await recordPayment(
      orgId,
      {
        amount: 0,
        method: "credit_note",
        entityId: cn.entityId,
        allocations: [
          { documentId: creditNoteId, amount: cn.total },
          { documentId: opts.targetDocumentId, amount: -cn.total },
        ],
      },
      { actorId: opts.actorId, docs: [cn, target] }
    );

    return { paymentId: result.paymentId, disposition };
  }

  throw new DomainError(`Unknown disposition: ${disposition}`, "unprocessable");
}

/**
 * Store-credit disposition: settle the credit note AND write a positive
 * `customer_credit` row (the wallet deposit) in one atomic batch via
 * `recordPayment`'s `extraStmts`.
 *
 * The CN's `total` is negative (e.g. −200). The allocation to the CN carries
 * that same negative amount, settling `balanceDue` to zero. The wallet entry
 * carries `−total` (positive), giving the entity store credit.
 */
async function applyStoreCreditDisposition(
  cn: Document,
  orgId: string,
  opts: { actorId?: string }
): Promise<CreditNoteDispositionResult> {
  const entityId = cn.entityId;
  if (!entityId) {
    throw new DomainError(
      "Store-credit disposition requires an entityId",
      "unprocessable"
    );
  }

  const paymentId = createId("pmt");
  const entryId = createId("cred");
  const creditAmount = -cn.total;

  await recordPayment(
    orgId,
    {
      amount: 0,
      method: "store_credit",
      entityId,
      allocations: [{ documentId: cn.id, amount: cn.total }],
    },
    {
      actorId: opts.actorId,
      docs: [cn],
      paymentId,
      extraStmts: [
        db.insert(customerCredit).values({
          id: entryId,
          organizationId: orgId,
          entityId,
          amount: creditAmount,
          type: "store_credit",
          paymentId,
        }),
      ],
    }
  );

  return { paymentId, disposition: "store_credit" as const };
}
