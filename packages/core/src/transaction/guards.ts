import type { Document, DocumentFamily, LineItem } from "@workspace/db/schema";
import { DomainError } from "../errors";
import { documentFamily } from "./family";

/**
 * Transition guards for the document hub. Immutability (C5) and the fiscal
 * freeze are core-enforced conventions — the schema under-advertises them, so
 * these helpers are load-bearing.
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
  if (doc.status !== "draft") {
    throw new DomainError(
      `Cannot finalize document ${doc.id} from status "${doc.status}" — only draft may finalize (C5)`,
      "conflict"
    );
  }
  const family = documentFamily(doc.type);
  if (family !== "fiscal") {
    throw new DomainError(
      `finalize freezes fiscal records; "${doc.type}" is a ${family} document (${doc.id})`,
      "unprocessable"
    );
  }
  return family;
}

export function assertHasLines(lines: LineItem[], docId: string): void {
  if (lines.length === 0) {
    throw new DomainError(
      `Cannot finalize document ${docId} with no line items`,
      "unprocessable"
    );
  }
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
