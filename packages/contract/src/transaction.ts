import { z } from "zod";

/**
 * Inbound (request) types for Transaction Core — hand-written Zod per ADR-004
 * (no drizzle-zod derivation). Mirrors the db enums; the row types come from db.
 *
 * Money values here are integer minor units (ADR-006), matching storage — the
 * UI converts major <-> minor at its boundary (@workspace/ui/lib/money).
 */

// document types mirror packages/db/src/schema/transactions.ts DOCUMENT_TYPES.
export const documentTypeSchema = z.enum([
  "quote",
  "sales_order",
  "purchase_order",
  "invoice",
  "credit_note",
  "receipt",
  "bill",
  "goods_receipt",
  "adjustment",
  "transfer",
]);
export const documentDirectionSchema = z.enum(["sales", "purchase"]);
export const taxModeSchema = z.enum(["exclusive", "inclusive"]);
export const fulfillmentModeSchema = z.enum([
  "stock",
  "drop_ship",
  "service",
  "none",
]);

export const lineItemInputSchema = z.object({
  productId: z.string().optional(),
  description: z.string().min(1),
  quantity: z.coerce.number().int().min(1).default(1),
  unitPrice: z.number().int().min(0).default(0), // minor units
  discount: z.number().int().min(0).optional(), // minor units
  taxRate: z.number().int().min(0).max(10_000).optional(), // basis points
  taxCode: z.string().nullable().optional(),
  taxMode: taxModeSchema.optional(),
  fulfillmentMode: fulfillmentModeSchema.optional(),
});

export const createDocumentSchema = z.object({
  type: documentTypeSchema,
  direction: documentDirectionSchema,
  entityId: z.string().optional(),
  entityName: z.string().optional(),
  currencyCode: z.string().optional(),
  series: z.string().optional(),
});

export type LineItemInput = z.infer<typeof lineItemInputSchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

// --- Settlement (§4) ----------------------------------------------------------

export const creditNoteDispositionSchema = z.enum([
  "cash_refund",
  "store_credit",
  "apply_to_document",
]);

/**
 * One allocation row: how much of a payment goes to a document. UPSERT
 * semantics: re-allocating the same (paymentId, documentId) pair is an UPDATE
 * under the unique index, not a second row (AC-5). `amount` is signed (negative
 * for credit notes).
 */
export const paymentAllocationInputSchema = z.object({
  documentId: z.string().min(1),
  amount: z.number().int(),
  effectiveAt: z.string().optional(),
});

/**
 * A payment header + its allocations (§4). `amount` is the total tender
 * received (signed: positive for payments, negative for reversals). The
 * allocation amounts should sum to `amount` (overpayment remainder goes to the
 * wallet — deferred to ALW-355; for now the remainder is unallocated).
 */
export const recordPaymentSchema = z.object({
  amount: z.number().int(),
  method: z.string().min(1),
  paidAt: z.string().optional(),
  reference: z.string().nullable().optional(),
  idempotencyKey: z.string().nullable().optional(),
  entityId: z.string().nullable().optional(),
  allocations: z.array(paymentAllocationInputSchema).min(1),
});
export type PaymentAllocationInput = z.infer<
  typeof paymentAllocationInputSchema
>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const reversePaymentSchema = z.object({
  reason: z.string().optional(),
});
export type ReversePaymentInput = z.infer<typeof reversePaymentSchema>;

export const createEntitySchema = z.object({
  name: z.string().min(1),
  type: z.enum(["customer", "supplier", "walk_in"]).default("customer"),
  creditLimit: z.number().int().nullable().optional(),
});
export type CreateEntityInput = z.infer<typeof createEntitySchema>;

// --- Summary shapes (lists / agent) -------------------------------------------

export const documentListItemSchema = z.object({
  id: z.string(),
  type: documentTypeSchema,
  status: z.string(),
  entityName: z.string().nullable(),
  currencyCode: z.string(),
  total: z.number().int(),
  folio: z.number().nullable(),
  createdAt: z.string(),
});
export const documentListSchema = z.array(documentListItemSchema);
export type DocumentListItem = z.infer<typeof documentListItemSchema>;
