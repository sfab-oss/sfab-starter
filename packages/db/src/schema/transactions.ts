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

export const ENTITY_TYPES = ["customer", "supplier", "walk_in"] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const CREDIT_NOTE_DISPOSITIONS = [
  "cash_refund",
  "store_credit",
  "apply_to_document",
] as const;
export type CreditNoteDisposition = (typeof CREDIT_NOTE_DISPOSITIONS)[number];

/**
 * A counterparty with the cached AR + wallet projections (§4/§8). `balance` is
 * the **net** AR (Σ open fiscal-sales balanceDue − creditBalance), rebuildable
 * via `rebuildEntityBalance`. `creditBalance` is the wallet projection
 * (rebuildable via `rebuildCreditBalance`). `creditLimit` gates fiado sales.
 */
export const entities = sqliteTable(
  "entities",
  {
    id: id(),
    organizationId: text("organization_id").notNull(),

    name: text("name").notNull(),
    type: text("type", { enum: ENTITY_TYPES }).default("customer").notNull(),

    // Net AR projection — Σ open fiscal-sales balanceDue − creditBalance (§4).
    balance: moneyMinor("balance").default(0).notNull(),
    // Wallet credit projection — Σ customer_credit.amount (rebuildable).
    creditBalance: moneyMinor("credit_balance").default(0).notNull(),
    // Credit limit for fiado checks (nullable = no limit).
    creditLimit: moneyMinor("credit_limit"),

    metadata: text("metadata", { mode: "json" }).$type<
      Record<string, unknown>
    >(),

    // Soft-archive — null = active. Archived entities stay on historical
    // documents (entityName snapshot) but drop out of pickers / default lists.
    archivedAt: text("archived_at"),

    ...timestamps,
  },
  (table) => [
    index("entities_org_type_idx").on(table.organizationId, table.type),
  ]
);

/**
 * A payment — the tender/receipt (§4). Signed `amount` (positive = received,
 * negative = reversal). `method` is an open string (cash, transfer, card …).
 * `reversesPaymentId` marks a compensating reversal payment.
 */
export const payments = sqliteTable(
  "payments",
  {
    id: id(),
    organizationId: text("organization_id").notNull(),

    amount: moneyMinor("amount").notNull(),
    method: text("method").notNull(),
    paidAt: text("paid_at").notNull(),
    reference: text("reference"),
    idempotencyKey: text("idempotency_key"),
    reversesPaymentId: text("reverses_payment_id"),

    entityId: text("entity_id"),

    metadata: text("metadata", { mode: "json" }).$type<
      Record<string, unknown>
    >(),

    ...timestamps,
  },
  (table) => [
    uniqueIndex("payments_org_idem_uniq").on(
      table.organizationId,
      table.idempotencyKey
    ),
    index("payments_org_entity_idx").on(table.organizationId, table.entityId),
    uniqueIndex("payments_org_reverses_uniq").on(
      table.organizationId,
      table.reversesPaymentId
    ),
  ]
);

/**
 * A payment ↔ document allocation row (§4). `amount` is signed (negative for
 * reversals/credit notes). `effectiveAt` is the posting timestamp for as-of
 * queries; `reversedAt` marks when this allocation was compensated.
 *
 * `unique(orgId, paymentId, documentId)` forbids double-allocation (C4) and
 * gives UPSERT semantics: re-allocating the same pair updates the row.
 */
export const paymentAllocations = sqliteTable(
  "payment_allocations",
  {
    id: id(),
    organizationId: text("organization_id").notNull(),

    paymentId: text("payment_id").notNull(),
    documentId: text("document_id").notNull(),
    amount: moneyMinor("amount").notNull(),

    effectiveAt: text("effective_at").notNull(),
    reversedAt: text("reversed_at"),

    metadata: text("metadata", { mode: "json" }).$type<
      Record<string, unknown>
    >(),

    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("pmt_alloc_org_pmt_doc_uniq").on(
      table.organizationId,
      table.paymentId,
      table.documentId
    ),
    index("pmt_alloc_org_doc_idx").on(table.organizationId, table.documentId),
    index("pmt_alloc_org_pmt_idx").on(table.organizationId, table.paymentId),
  ]
);

export const CREDIT_ENTRY_TYPES = [
  "deposit",
  "overpay",
  "store_credit",
  "claim",
  "redemption",
  "correction",
] as const;
export type CreditEntryType = (typeof CREDIT_ENTRY_TYPES)[number];

/**
 * The customer-credit wallet — append-only, signed amounts (§4).
 *
 * Holds deposits / overpayment / store credit / `saldo a favor` — structurally
 * the liability opposite of AR. `entityId` is **nullable** for walk-ins (C3):
 * a walk-in deposit writes a `reference` (claim token); redemption requires
 * presenting it. Corrections are **compensating rows** — never UPDATE in place.
 *
 * `creditBalance` on the entity is a rebuilt projection: `SUM(amount)` across
 * all rows for that entity. Positive amounts increase credit (deposit);
 * negative amounts consume it (redemption).
 *
 * @see docs/architecture/transaction-core.md §4
 */
export const customerCredit = sqliteTable(
  "customer_credit",
  {
    id: id(),
    organizationId: text("organization_id").notNull(),

    // Nullable for walk-ins (C3). A walk-in deposit writes a reference token;
    // redemption by reference claims it into an entity's scope.
    entityId: text("entity_id"),
    amount: moneyMinor("amount").notNull(),
    type: text("type", { enum: CREDIT_ENTRY_TYPES }).notNull(),

    // Links to the payment that created this entry (e.g. a deposit payment or
    // a redemption payment with its allocation).
    paymentId: text("payment_id"),

    // Walk-in claim token — the reference that links a walk-in deposit to its
    // later redemption.
    reference: text("reference"),

    // Double-claim prevention: set to `reference` ONLY on the walk-in-scope
    // claim debit row. NULL for all other rows. SQLite treats NULL as distinct
    // in UNIQUE constraints, so only one claim per reference can land.
    claimReference: text("claim_reference"),

    notes: text("notes"),

    metadata: text("metadata", { mode: "json" }).$type<
      Record<string, unknown>
    >(),

    ...timestamps,
  },
  (table) => [
    index("customer_credit_org_entity_idx").on(
      table.organizationId,
      table.entityId
    ),
    index("customer_credit_org_payment_idx").on(
      table.organizationId,
      table.paymentId
    ),
    index("customer_credit_org_reference_idx").on(
      table.organizationId,
      table.reference
    ),
    uniqueIndex("customer_credit_claim_ref_uniq").on(
      table.organizationId,
      table.claimReference
    ),
  ]
);

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type LineItem = typeof lineItems.$inferSelect;
export type NewLineItem = typeof lineItems.$inferInsert;
export type Sequence = typeof sequences.$inferSelect;
export type NewSequence = typeof sequences.$inferInsert;
export type Entity = typeof entities.$inferSelect;
export type NewEntity = typeof entities.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type PaymentAllocation = typeof paymentAllocations.$inferSelect;
export type NewPaymentAllocation = typeof paymentAllocations.$inferInsert;
export type CustomerCredit = typeof customerCredit.$inferSelect;
export type NewCustomerCredit = typeof customerCredit.$inferInsert;
