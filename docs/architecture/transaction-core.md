# Transaction Core — the document hub

> The hub every commercial flow and every localized pack grafts onto. The **why**
> and the alternatives are in [ADR-006](../decisions/006-transaction-core.md); this
> is the **what** — the model, its lifecycle, the event spine, the surrounding
> primitives, and the seams packs extend.

Transaction Core is **country-neutral**. Mexican concepts (factura/CFDI, fiado,
apartado, corte de caja) are *configured instances* of generic primitives shipped
by packs, never base columns. The base is a **generous, legible superset** — and
deliberately a **prescriptive** one: good-practice primitives (record deposits as
liabilities, keep a running statement, track provenance) ship on by sensible
default, so an owner gets operations they didn't know to ask for. It is **not** a
plugin framework; *legible, not optimal* is the stopping line.

---

## 1. The Documents + LineItems model

One `documents` table + one `line_items` table carry every business document.

```ts
documents = {
  id, organizationId,
  type,            // quote | sales_order | purchase_order | invoice | credit_note | receipt | bill | goods_receipt | adjustment | transfer
  family,          // commercial | fiscal | stock  — PERSISTED, CHECK-linked to type
  direction,       // sales | purchase
  status,          // lifecycle (see §2); type-dependent, enforced in contract/core
  entityId,        // counterparty (nullable: walk-in); + denormalized snapshot
  // money (integer minor units — see §3)
  currencyCode, subtotal, discountTotal, taxTotal, total,
  amountPaid, balanceDue, paymentStatus,   // PROJECTIONS — derived, rebuildable (§4)
  // numbering & time (§5, §6)
  series, folio, issuedAt, postingDate, voidedAt,
  // lineage
  sourceDocumentId, rootDocumentId, reversesDocumentId,
  settlementStatus,   // active | fulfilled | cancelled_with_settlement (≠ paymentStatus)
  lastAppliedPaymentId, // projection checkpoint — perf hint only
  metadata,           // namespaced JSON seam
  createdAt, updatedAt,
}

line_items = {
  id, organizationId, documentId,
  productId,          // nullable — line carries a snapshot so history survives catalog edits
  description, quantity, unitPrice, discount,
  taxRate, taxCode, taxAmount, taxableBase,   // one generic tax per line (§3); taxCode opaque
  fulfillmentMode,    // stock | drop_ship | service | none  → drives the stock gate (§7)
  warehouseId,        // nullable
  // optional fan-out counters: quantityInvoiced | quantityDelivered | quantityReturned
  metadata,
}
```

**Families** are the spine. A `type` belongs to exactly one family; the family —
not the type — decides validation, immutability, posting, and which columns are
meaningful. `core.documentFamily(type)` is the single resolver (no default branch;
an unmapped type is a hard error). The persisted `family` column + a `db` CHECK
keep agent-generated SQL honest (so `SUM(balanceDue)` filtered by family can't
silently double-count a quote against its invoice).

**Progression is by immutable successor**, never by mutating `type`. Converting a
quote to an order to an invoice inserts a **new header + copied line snapshots**,
linked by `sourceDocumentId` (parent) and `rootDocumentId` (origin of the chain). A
predecessor under *partial* fan-out stays open with rolled-up child quantities
rather than flipping to `converted` early.

**`quote = order = invoice = PO`** in *structure* — one shape an agent learns once —
but the three **families** give each the discipline it needs (a quote is mutable
scratch; a finalized invoice is a frozen financial record).

---

## 2. The status lifecycle

Two axes, kept separate:

- **`status`** — the document's own lifecycle, type-dependent:
  `draft → finalized → (voided)`, with commercial sugar (`sent`, `accepted`,
  `converted`) and stock sugar (`received`) layered per family. Validity is
  enforced in `contract`/`core` transition guards, **not** a DB CHECK (too many
  type-specific paths).
- **`paymentStatus`** — `unpaid | partial | paid`, **derived** from settlement
  facts (§4), never set by hand.
- **`settlementStatus`** — `active | fulfilled | cancelled_with_settlement` — the
  commercial outcome, distinct from payment arithmetic. (A defaulted layaway can be
  `cancelled_with_settlement` while money was kept — `paymentStatus` alone would
  lie.)

**Immutability boundary:** a **draft** is editable in place. Once a **fiscal**
document is **finalized**, its lines, totals, tax, and identity **freeze** — only
payment/posting/status columns advance, and corrections happen via a `credit_note`
successor (with a `disposition`: cash refund | store credit | apply-to-document).
Commercial drafts stay mutable; stock docs are usually a pack concern. Void/cancel
is a **reversal marker** (`voidedAt` + `reversesDocumentId`), not a status flip that
erases history.

---

## 3. Money and tax

**Money is integer minor units** (the smallest currency unit), exposed as a branded
`MoneyMinor` customType, with a single `core/money` value helper (add / subtract /
allocate / round, currency-aware). Rules: all math on integers; rates and discounts
as integer **basis points**; **round per line, header total = exact Σ of lines**;
`currencyCode` (ISO 4217) on the document, minor-unit exponent from a static ISO map.
This replaces the earlier `numeric → number` placeholder (ADR-006) — floats never
touch money.

**One generic tax per line** is the base — `taxRate` (bps), a stored line-rounded
`taxAmount`, an opaque nullable `taxCode`, and an optional `taxableBase`. Header
`taxTotal` is **traslados charged to the buyer, excluding withholdings**. This is
the correct *degenerate* form, confirmed against real tax engines — not a
simplification to be apologized for. A frozen **tax context** (`metadata.tax`:
ship-to/from, date, provider, calc id) captures what an engine or a fiscal `Base`
field needs at finalize.

**Multi-tax is a pack.** IVA + retención + IEPS, compound rates, and per-jurisdiction
breakdowns live in an additive `line_tax_components` pack table; the base
`taxAmount`/`taxRate` are then the engine's output snapshot and input. The base
stays single-tax so the common path is legible.

---

## 4. Settlement — payments, allocations, the wallet

Money correctness, not the table count, is what the hub had to get right.

- **A payment is a header + allocation rows.** `payments` (the tender/receipt:
  signed `amount`, `method` as an open string, `paidAt`, `reference`,
  `idempotencyKey`, `reversesPaymentId`) **+ `payment_allocations`**
  (`paymentId ↔ documentId ↔ amount`, with an `effectiveAt` posting timestamp).
  One bank transfer settling six invoices is one payment + six allocations.
  `core.recordPayment({ header, allocations[] })` writes the payment and every
  touched document's projection **atomically**. Allocations may target **fiscal
  documents only** (hard-rejected otherwise); `unique(orgId, paymentId, documentId)`
  forbids double-allocation.
- **Payments + finalized documents are the authoritative facts.**
  `documents.amountPaid`/`balanceDue`/`paymentStatus` and `entity.balance` are
  **projections** — persisted for O(1) reads, but **rebuildable** by
  `core.rebuild*` from the facts. `lastAppliedPaymentId` is a perf hint only; the
  authoritative rebuild is a full scan, and reversals are **compensating rows** (so
  reversing an old payment can't leave a stale "paid"). As-of / aging reports
  rebuild from `effectiveAt`, never from the live cache.
- **The `customer_credit` wallet** (append-only, signed, per entity, `entityId`
  nullable for walk-ins) holds deposits / overpayment / `saldo a favor` —
  structurally the liability opposite of AR. A deposit or overpay lands **only** in
  the wallet (never also as an AR allocation); it later applies to an invoice via an
  allocation row.
- **One conservation identity, enforced in `core`:**
  `entity.balance (AR) = Σ open fiscal-sales balanceDue − creditBalance`, and
  `Σ allocations against a doc = doc.amountPaid`. A peso lives in exactly one place.
  `entity.balance` is **sales-fiscal AR only** — supplier `bill`s (AP) are a
  separate scope and never poison a customer's fiado balance.

---

## 5. Numbering / folios

A `sequences(orgId, key)` row is bumped **atomically at finalize only** — drafts
never consume a number. `key` is open (per series / type / register), so a project
configures whatever folio scheme it needs (a Mexican CFDI series, a per-register POS
counter). Gaps are allowed by default; a *gapless* guarantee, if a jurisdiction
needs one, is a pack concern, not a base promise. Credit-note successors and voids
draw their own numbers — the original folio is never reused.

---

## 6. Temporal

- **`postingDate`** (default = `issuedAt`) is distinct from created/issued and is
  what drives aging, the tax period, and any future GL — so a payment that lands in
  a new month for last month's invoice is attributed correctly.
- **`assertPostingAllowed(date)`** is a fiscal-period seam; close *enforcement* is a
  pack, but the hook ships.
- **As-of helpers** (`computeOpenBalanceAsOf`, `listOpenReceivablesAsOf`) rebuild
  from payment/allocation `effectiveAt` facts — the cache answers "now," the facts
  answer "as of."

---

## 7. The domain-event spine (AC-2)

The hub **emits domain events; it does not contain pack logic.**
`core.emitDomainEvent(tx, …)` writes a `kind:event` row **inside the D1 batch**,
then dispatches **two-tier**:

- **`critical`** handlers run **in the same transaction** — only the two the base
  owns: the **stock effect** (§8) and folio reservation. They must be fast and
  cannot be skipped.
- **`afterCommit`** handlers run **after** the write commits, non-blocking —
  notifications, fiscal stamping (timbrado), shift/corte totals, and the **GL
  posting hook**. (Posting is deliberately *not* in the critical tier: a synchronous
  balanced-journal write would lengthen the single-writer D1 transaction into a POS
  latency bomb. It runs afterCommit with an idempotent journal rebuild.)

`sale_completed ≠ document_finalized` — they are distinct events so packs subscribe
to the right one. The event row is also the **replay substrate**: no Cloudflare
Queue in the base; the log is the source for rebuilds.

**The spine feeds three consumers from one emission:**

1. **The pack hook** — packs (inventory, fiscal, GL) subscribe to events to do their
   work; they never patch the hub.
2. **The event log (BI / reporting)** — the append-only `kind:event` stream is what
   reporting reads, so analytics never couples to live mutable rows.
3. **The activity timeline** — the same events surface as a human-readable history
   on the document and the entity.

---

## 8. Surrounding primitives (AC-3)

How the other Tier-1 primitives relate to the hub:

- **Catalog** — `line_items.productId` is **nullable** and every line carries a
  **snapshot** (description, price, tax), so a document is historically faithful even
  after the catalog changes. Inventory is **event-driven**, gated by
  `shouldAffectStock(line)` = catalog `tracksInventory` × line `fulfillmentMode`:
  the critical stock handler decrements **only** stock-effecting lines, so
  drop-ship / service / consignment lines don't post fictional movements. Stock
  movements themselves live in an inventory pack.
- **Entity & Contact** — `documents.entityId` is **nullable** (walk-in) with a
  counterparty **snapshot**. The entity carries the cached **AR `balance`** (§4,
  rebuildable), a `creditBalance` (wallet), and an optional `creditLimit` for a
  credit check / estado de cuenta. A bulk payment + a running statement are driven
  off allocations, not a single scalar.
- **Activity & Audit Log** — one unified log with `kind: audit | event | note`. The
  hub's domain events land here as `kind:event` (§7); edits and human notes share
  the table, giving one timeline per document/entity.
- **File Hub** — a polymorphic attach (a quote PDF, a signed delivery note, a
  supplier's scanned bill) references the document; no per-type file columns on the
  hub.

---

## 9. Seams packs extend (AC-4)

**Base seams** (shipped, extended by packs):

- Two-tier event dispatch (`critical` / `afterCommit`) — the primary pack hook.
- Open `paymentMethod` · generous `type` set · open `sequences` keys.
- `taxCode` / `taxMode` + frozen tax context + `taxableBase`.
- `payment_allocations` (one tender → N documents).
- `customer_credit` wallet (deposits / overpay / store credit).
- The **GL posting hook** (afterCommit) — a contabilidad pack writes a balanced
  journal; the base ships **no GL**.
- Namespaced `metadata` on documents and lines.
- Header + line `discount`.
- Nullable `entityId` + `creditLimit` + rebuildable balance/wallet.
- Line `warehouseId` + `fulfillmentMode` / `shouldAffectStock` stock gate.
- Transition guards + `assertPostingAllowed` (period seam).
- `postingDate` / reversal markers (`voidedAt`, `reversesDocumentId/PaymentId`).
- Immutable successors + the **financial-family split seam** (promote the fiscal
  family to its own `financial_documents` table later, non-breaking, via a base
  fiscal view + `resolveDocument(id)`).
- The **functional-currency seam** (optional `baseTotal` / `exchangeRate`, deferred
  for a pure-MXN v1).
- The `core` read/query surface + the agent-tool and `components` seams.

**Pack-only** (not in the base schema): a `compliance_documents` sidecar (CFDI lives
beside the hub, not as a base `complianceDocId`) · `line_tax_components` · inventory
`movements` · GL/journal · fulfilment gating · corte reads · CFDI anticipo netting.

**Out of scope (v1):** an RMA workflow · a plugin/EAV framework · a Cloudflare
Queue · a gapless-numbering guarantee · full bitemporal history.

---

## 10. Worked examples (country-neutral hub, Mexican skin)

- **Cash sale (nota)** — a `receipt`/`invoice` finalized; `recordPayment` with one
  allocation; the stock handler decrements stock-effecting lines; `sale_completed`
  fires the corte and (afterCommit) the fiscal stamp.
- **Fiado (credit sale)** — finalized invoice, no payment yet; `entity.balance`
  reflects AR; later payments allocate against it.
- **One transfer, six invoices (B2B)** — one `payment` header + six
  `payment_allocations`; the statement and credit-limit check read the allocations.
- **Advance deposit (anticipo)** — a payment lands in `customer_credit (deposit)`
  (not as AR); when the invoice is finalized, an allocation applies the credit.
  CFDI anticipo netting is a pack on top.
- **Saldo a favor** — an overpayment or a store-credit `credit_note` raises the
  wallet `creditBalance`, queryable per entity.
- **Return to store credit** — a `credit_note` successor reverses the right lines'
  tax, the stock handler restocks stock-effecting lines, and the credit lands in the
  wallet by `disposition`.
- **Month-end AR** — `listOpenReceivablesAsOf(date)` rebuilt from payment facts, so a
  payment booked in the new month doesn't distort last month's aging.

---

## Files of interest (once built — [[ALW-299]])

- `packages/db/src/schema/transactions.ts` — the `documents` / `line_items` /
  `payments` / `payment_allocations` / `customer_credit` / `sequences` tables.
- `packages/core/src/money.ts` — the `MoneyMinor` value helper.
- `packages/core/src/transaction/` — `documentFamily`, `finalize`, `recordPayment`,
  `rebuild*`, the transition guards, and `emitDomainEvent`.
- `packages/contract/src/transaction.ts` — the inbound Zod inputs.
