import { db } from "@workspace/db";
import type { CreditNoteDisposition } from "@workspace/db/schema";
import { documents } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import { DomainError } from "../errors";
import { recordPayment } from "./payments";

/**
 * Credit-note disposition routing (§2, §4).
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
 * - **store_credit** — deferred to the wallet task (ALW-355). Returns a clear
 *   not-implemented error.
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
  if (disposition === "store_credit") {
    throw new DomainError(
      "Store-credit disposition requires the customer_credit wallet (ALW-355)",
      "unprocessable"
    );
  }

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
