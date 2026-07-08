import { z } from "zod";
import { paginationQuerySchema } from "./pagination";

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
  // Public API: positive quantities only. Credit-note reverse sign is applied
  // in core (successor copy + draft normalize), not at the contract boundary.
  quantity: z.coerce.number().int().min(1).default(1),
  unitPrice: z.number().int().min(0).default(0), // minor units
  discount: z.number().int().min(0).optional(), // minor units
  taxRate: z.number().int().min(0).max(10_000).optional(), // basis points
  taxCode: z.string().nullable().optional(),
  taxMode: taxModeSchema.optional(),
  fulfillmentMode: fulfillmentModeSchema.optional(),
});

export const updateLineItemSchema = z.object({
  productId: z.string().nullable().optional(),
  description: z.string().min(1).optional(),
  quantity: z.coerce.number().int().min(1).optional(),
  unitPrice: z.number().int().min(0).optional(),
  discount: z.number().int().min(0).optional(),
  taxRate: z.number().int().min(0).max(10_000).optional(),
  taxCode: z.string().nullable().optional(),
  taxMode: taxModeSchema.optional(),
  fulfillmentMode: fulfillmentModeSchema.optional(),
});

/** v1 types offered by the hub New-document menu (credit notes are successors only). */
export const createableDocumentTypeSchema = z.enum([
  "quote",
  "invoice",
  "bill",
]);

export const createDocumentSchema = z.object({
  type: documentTypeSchema,
  direction: documentDirectionSchema,
  entityId: z.string().optional(),
  entityName: z.string().optional(),
  currencyCode: z.string().optional(),
  series: z.string().optional(),
});

/** Successor types createable from an existing document (immutable progression). */
export const successorDocumentTypeSchema = z.enum(["invoice", "credit_note"]);

export const createSuccessorSchema = z.object({
  type: successorDocumentTypeSchema,
});

export const listDocumentsQuerySchema = paginationQuerySchema.extend({
  type: documentTypeSchema.optional(),
  direction: documentDirectionSchema.optional(),
  status: z
    .enum([
      "draft",
      "sent",
      "accepted",
      "converted",
      "finalized",
      "received",
      "voided",
    ])
    .optional(),
  entityId: z.string().optional(),
});

export type LineItemInput = z.infer<typeof lineItemInputSchema>;
export type UpdateLineItemInput = z.infer<typeof updateLineItemSchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type CreateSuccessorInput = z.infer<typeof createSuccessorSchema>;
export type ListDocumentsQuery = z.infer<typeof listDocumentsQuerySchema>;
export type CreateableDocumentType = z.infer<
  typeof createableDocumentTypeSchema
>;

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
 * received (non-negative for inbound HTTP; reversals carry a negative amount
 * but are created programmatically by `reversePayment`, not via this schema).
 * The allocation amounts should sum to `amount` (overpayment remainder goes to
 * the wallet — deferred to ALW-355; for now the remainder is unallocated).
 */
export const recordPaymentSchema = z.object({
  amount: z.number().int().min(0),
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

// --- Wallet (§4 — customer_credit) -------------------------------------------

export const depositCreditSchema = z.object({
  entityId: z.string().nullable().optional(),
  amount: z.number().int().min(1),
  type: z.enum(["deposit", "overpay", "store_credit"]).default("deposit"),
  method: z.string().optional(),
  reference: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  paidAt: z.string().optional(),
  idempotencyKey: z.string().nullable().optional(),
});
export type DepositCreditInput = z.infer<typeof depositCreditSchema>;

export const redeemCreditSchema = z.object({
  entityId: z.string().min(1),
  documentId: z.string().min(1),
  amount: z.number().int().min(1),
});
export type RedeemCreditInput = z.infer<typeof redeemCreditSchema>;

export const redeemCreditByReferenceSchema = z.object({
  reference: z.string().min(1),
  entityId: z.string().min(1),
  documentId: z.string().min(1),
  amount: z.number().int().min(1),
});
export type RedeemCreditByReferenceInput = z.infer<
  typeof redeemCreditByReferenceSchema
>;

export const entityTypeSchema = z.enum(["customer", "supplier", "walk_in"]);
export type EntityTypeInput = z.infer<typeof entityTypeSchema>;

export const createEntitySchema = z.object({
  name: z.string().min(1),
  type: entityTypeSchema.default("customer"),
  creditLimit: z.number().int().nullable().optional(),
});
export type CreateEntityInput = z.infer<typeof createEntitySchema>;

export const updateEntitySchema = z.object({
  name: z.string().min(1).optional(),
  type: entityTypeSchema.optional(),
  creditLimit: z.number().int().nullable().optional(),
});
export type UpdateEntityInput = z.infer<typeof updateEntitySchema>;

export const entityFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: entityTypeSchema,
  creditLimit: z.number().int().nullable().optional(),
});
export type EntityFormValues = z.infer<typeof entityFormSchema>;

export const listEntitiesQuerySchema = paginationQuerySchema.extend({
  type: entityTypeSchema.optional(),
  includeArchived: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .optional()
    .transform((v) => v === true || v === "true"),
});
export type ListEntitiesQuery = z.infer<typeof listEntitiesQuerySchema>;

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
