import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { createdAt, id, moneyMinor, timestamps, updatedAt } from "../utils";

/**
 * Transaction Core — the document hub (ADR-006).
 *
 * One `documents` + one `line_items` table carry every business document,
 * discriminated by `type`/`family`/`direction`/`status`. `family` is the spine:
 * it is a PERSISTED column with a DB CHECK linked to `type` (C9), and the
 * single TS resolver lives in `@workspace/core/transaction` (`documentFamily`).
 * The CHECK below and that resolver both derive from `DOCUMENT_FAMILY` so they
 * cannot drift; `apps/web/test/transaction.test.ts` asserts they agree.
 *
 * @see docs/architecture/transaction-core.md §1–§3
 */

// --- Document types, families, and their link (C9) ---------------------------

export const DOCUMENT_TYPES = [
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
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_FAMILIES = ["commercial", "fiscal", "stock"] as const;
export type DocumentFamily = (typeof DOCUMENT_FAMILIES)[number];

/**
 * The complete type -> family map (C9). Defined up front because SQLite cannot
 * ALTER a CHECK — every type whose flow lands later is already mapped here.
 * `core.documentFamily()` resolves against this; the DB CHECK mirrors it.
 */
export const DOCUMENT_FAMILY: Record<DocumentType, DocumentFamily> = {
  // commercial — mutable scratch / negotiation
  quote: "commercial",
  sales_order: "commercial",
  purchase_order: "commercial",
  // fiscal — frozen financial record once finalized
  invoice: "fiscal",
  credit_note: "fiscal",
  receipt: "fiscal",
  bill: "fiscal",
  // stock — usually a pack concern
  goods_receipt: "stock",
  adjustment: "stock",
  transfer: "stock",
};

// Raw SQL for the CHECK: each (type, family) pair OR'd together. Literal values
// (CHECK expressions are compiled into the schema; bound params are not allowed).
const familyTypeCheck = sql`(${sql.raw(
  (Object.entries(DOCUMENT_FAMILY) as [DocumentType, DocumentFamily][])
    .map(([t, f]) => `type = '${t}' AND family = '${f}'`)
    .join(" OR ")
)})`;

// --- documents ---------------------------------------------------------------

export const DOCUMENT_DIRECTIONS = ["sales", "purchase"] as const;
export type DocumentDirection = (typeof DOCUMENT_DIRECTIONS)[number];

// Status is type-dependent and enforced in contract/core (not a family-specific
// DB CHECK); the union here is the full set across all families.
export const DOCUMENT_STATUSES = [
  "draft",
  "sent",
  "accepted",
  "converted",
  "finalized",
  "received",
  "voided",
] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const PAYMENT_STATUSES = ["unpaid", "partial", "paid"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const SETTLEMENT_STATUSES = [
  "active",
  "fulfilled",
  "cancelled_with_settlement",
] as const;
export type SettlementStatus = (typeof SETTLEMENT_STATUSES)[number];

export const documents = sqliteTable(
  "documents",
  {
    id: id(),
    organizationId: text("organization_id").notNull(),

    type: text("type", { enum: DOCUMENT_TYPES }).notNull(),
    family: text("family", { enum: DOCUMENT_FAMILIES }).notNull(),
    direction: text("direction", { enum: DOCUMENT_DIRECTIONS }).notNull(),
    status: text("status", { enum: DOCUMENT_STATUSES })
      .default("draft")
      .notNull(),

    // Counterparty (nullable: walk-in) + denormalized snapshot so a document
    // stays historically faithful after an entity edit (§8).
    entityId: text("entity_id"),
    entityName: text("entity_name"),

    // Money — integer minor units (§3).
    currencyCode: text("currency_code").default("USD").notNull(),
    subtotal: moneyMinor("subtotal").default(0).notNull(),
    discountTotal: moneyMinor("discount_total").default(0).notNull(),
    taxTotal: moneyMinor("tax_total").default(0).notNull(),
    total: moneyMinor("total").default(0).notNull(),
    // PROJECTIONS — derived, rebuildable from payment facts (§4). ALW-354 fills
    // them; shipped at defaults now so no second table-rebuild is needed.
    amountPaid: moneyMinor("amount_paid").default(0).notNull(),
    balanceDue: moneyMinor("balance_due").default(0).notNull(),
    paymentStatus: text("payment_status", { enum: PAYMENT_STATUSES })
      .default("unpaid")
      .notNull(),

    // Numbering / folios (§5) — drawn atomically at finalize only.
    series: text("series"),
    folio: integer("folio"),

    // Temporal (§6).
    issuedAt: text("issued_at"),
    postingDate: text("posting_date"),
    voidedAt: text("voided_at"),

    // Lineage — progression by immutable successor (§1).
    sourceDocumentId: text("source_document_id"),
    rootDocumentId: text("root_document_id"),
    reversesDocumentId: text("reverses_document_id"),

    // Commercial outcome, distinct from payment arithmetic (§2).
    settlementStatus: text("settlement_status", {
      enum: SETTLEMENT_STATUSES,
    })
      .default("active")
      .notNull(),
    // Projection checkpoint — perf hint only (§4).
    lastAppliedPaymentId: text("last_applied_payment_id"),

    // Namespaced JSON seam (§9).
    metadata: text("metadata", { mode: "json" }).$type<
      Record<string, unknown>
    >(),

    ...timestamps,
  },
  (table) => [
    check("documents_family_type_check", familyTypeCheck),
    index("documents_org_type_idx").on(table.organizationId, table.type),
    index("documents_org_status_idx").on(table.organizationId, table.status),
    index("documents_org_entity_idx").on(table.organizationId, table.entityId),
    index("documents_org_folio_idx").on(
      table.organizationId,
      table.series,
      table.folio
    ),
  ]
);

// --- line_items ---------------------------------------------------------------

export const FULFILLMENT_MODES = [
  "stock",
  "drop_ship",
  "service",
  "none",
] as const;
export type FulfillmentMode = (typeof FULFILLMENT_MODES)[number];

export const TAX_MODES = ["exclusive", "inclusive"] as const;
export type TaxMode = (typeof TAX_MODES)[number];

export const lineItems = sqliteTable(
  "line_items",
  {
    id: id(),
    organizationId: text("organization_id").notNull(),
    documentId: text("document_id").notNull(),

    // Nullable productId + snapshot: history survives catalog edits (§8).
    productId: text("product_id"),
    description: text("description").notNull(),
    quantity: integer("quantity").default(1).notNull(),
    unitPrice: moneyMinor("unit_price").default(0).notNull(),
    discount: moneyMinor("discount").default(0).notNull(),

    // One generic tax per line (§3); multi-tax is a pack (line_tax_components).
    taxRate: integer("tax_rate").default(0).notNull(), // basis points
    taxCode: text("tax_code"), // opaque
    taxMode: text("tax_mode", { enum: TAX_MODES })
      .default("exclusive")
      .notNull(),
    taxAmount: moneyMinor("tax_amount").default(0).notNull(),
    taxableBase: moneyMinor("taxable_base").default(0).notNull(),

    // Stock gate (§7/§8): shouldAffectStock(line) = catalog.tracksInventory x
    // fulfillmentMode. Bare nullable warehouseId — the location table is a pack.
    fulfillmentMode: text("fulfillment_mode", { enum: FULFILLMENT_MODES })
      .default("none")
      .notNull(),
    warehouseId: text("warehouse_id"),

    metadata: text("metadata", { mode: "json" }).$type<
      Record<string, unknown>
    >(),

    createdAt,
    updatedAt,
  },
  (table) => [
    index("line_items_org_document_idx").on(
      table.organizationId,
      table.documentId
    ),
    index("line_items_org_product_idx").on(
      table.organizationId,
      table.productId
    ),
  ]
);

// --- sequences (folios) -------------------------------------------------------

/**
 * Per-(org, key) folio counter, bumped atomically at finalize (§5). `key` is
 * open (per series/type/register) so a project configures its folio scheme.
 * Gaps are allowed; a gapless guarantee, if a jurisdiction needs one, is a pack.
 */
export const sequences = sqliteTable(
  "sequences",
  {
    id: id(),
    organizationId: text("organization_id").notNull(),
    key: text("key").notNull(),
    next: integer("next").default(1).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("sequences_org_key_uniq").on(table.organizationId, table.key),
  ]
);

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type LineItem = typeof lineItems.$inferSelect;
export type NewLineItem = typeof lineItems.$inferInsert;
export type Sequence = typeof sequences.$inferSelect;
export type NewSequence = typeof sequences.$inferInsert;
