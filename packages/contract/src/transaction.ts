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

// Summary shape for lists / the agent (omits heavy projection + lineage cols).
export const documentListItemSchema = z.object({
  id: z.string(),
  type: documentTypeSchema,
  status: z.string(),
  entityName: z.string().nullable(),
  currencyCode: z.string(),
  total: z.number(),
  folio: z.number().nullable(),
  createdAt: z.string(),
});
export const documentListSchema = z.array(documentListItemSchema);
export type DocumentListItem = z.infer<typeof documentListItemSchema>;
