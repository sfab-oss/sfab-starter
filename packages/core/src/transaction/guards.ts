import type { Document, DocumentFamily, LineItem } from "@workspace/db/schema";
import { documentFamily } from "./family";

/**
 * Transition + posting guards for the document hub. Immutability (C5) and the
 * fiscal freeze are core-enforced conventions — the schema under-advertises
 * them, so these helpers are load-bearing.
 *
 * @see docs/architecture/transaction-core.md §2, §6
 */

/**
 * Assert a document may be finalized. Returns its family. Finalize **freezes a
 * fiscal record** (C5): commercial docs progress via immutable successors
 * (quote -> order -> invoice), and stock docs are a pack concern, so only the
 * fiscal family finalize-freezes. Only a draft may finalize; a finalized doc is
 * immutable (corrections are credit_note successors), a voided one is dead.
 */
export function assertCanFinalize(doc: Document): DocumentFamily {
  if (doc.status === "finalized") {
    throw new Error(
      `Document ${doc.id} is already finalized — fiscal records are immutable (C5)`
    );
  }
  if (doc.status === "voided") {
    throw new Error(`Cannot finalize a voided document (${doc.id})`);
  }
  if (doc.status !== "draft") {
    throw new Error(
      `Cannot finalize from status "${doc.status}" (only draft; ${doc.id})`
    );
  }
  const family = documentFamily(doc.type);
  if (family !== "fiscal") {
    throw new Error(
      `finalize freezes fiscal records; "${doc.type}" is a ${family} document (${doc.id})`
    );
  }
  return family;
}

/** A document needs at least one line to finalize. */
export function assertHasLines(lines: LineItem[], docId: string): void {
  if (lines.length === 0) {
    throw new Error(`Cannot finalize document ${docId} with no line items`);
  }
}

/**
 * SEAM: fiscal-period posting guard (§6). Close *enforcement* is a pack, but the
 * hook ships — a period-close pack rejects posting into a closed period here.
 * The base permits any date.
 */
export function assertPostingAllowed(_postingDate: string): void {
  // SEAM: a fiscal-period-close pack rejects posting into a closed period here.
}

/**
 * The stock gate (§7/§8): a line affects stock only when the catalog item
 * tracks inventory AND the line fulfils as `stock`. Drop-ship / service /
 * consignment lines post no fictional movement. The stock *handler* is
 * pack-owned (ALW-350); the base ships only this gate.
 */
export function shouldAffectStock(
  line: Pick<LineItem, "fulfillmentMode">,
  tracksInventory: boolean
): boolean {
  return tracksInventory && line.fulfillmentMode === "stock";
}
