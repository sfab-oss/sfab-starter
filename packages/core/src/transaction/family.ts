import type { DocumentFamily } from "@workspace/db/schema";
import { DOCUMENT_FAMILY } from "@workspace/db/schema";

export type {
  DocumentDirection,
  DocumentFamily,
  DocumentStatus,
  DocumentType,
  FulfillmentMode,
  PaymentStatus,
  SettlementStatus,
  TaxMode,
} from "@workspace/db/schema";

/**
 * Resolve the family for a document type — the single source of truth (C9).
 *
 * `family` — not `type` — decides validation, immutability, and posting. There
 * is **no default branch**: an unmapped type is a hard error (a bug or an
 * untyped boundary value), matching the `documents_family_type_check` DB CHECK.
 * The CHECK and this resolver both derive from `DOCUMENT_FAMILY`, so they
 * cannot drift; `apps/web/test/transaction.test.ts` asserts they agree.
 *
 * @see docs/architecture/transaction-core.md §1
 */
export function documentFamily(type: string): DocumentFamily {
  const family = (DOCUMENT_FAMILY as Record<string, DocumentFamily>)[type];
  if (!family) {
    throw new Error(`documentFamily: unknown document type "${type}"`);
  }
  return family;
}
