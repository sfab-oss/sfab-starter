# ADR-006: Transaction Core — the document hub

**Status:** Accepted
**Date:** 2026-06-19
**Authors:** Alwurts
**Supersedes / Superseded by:** —

## Context

The template needs one **hub** that every commercial flow and every localized pack
(POS, fiscal invoicing, store-credit, …) grafts onto. The question is its shape:
one structure for all business documents, or several. This is costly to reverse
(it shapes the schema, the money model, and every pack seam), cross-cutting (every
capability touches it), and had real alternatives — so it earns a record.

The design was pressure-tested against the history of accounting/ERP/commerce/
billing systems (double-entry, event-sourcing, Odoo, SAP, Stripe, billing engines,
QBO/Xero, tax engines) and stress-tested with concrete SME scenarios, then
adversarially red-teamed. The full spec is
[`docs/architecture/transaction-core.md`](../architecture/transaction-core.md).

Two prior conventions are touched. Money was a placeholder `numeric → number`
customType (flagged "for revisit" in code); this decision reverses it to integer
minor units. Everything else (layer slicing, two schema sources, ISO-text
timestamps) stands.

## Decision

> We will model every business document as **one `documents` + one `line_items`
> table** discriminated by `type`/`status`/`direction`, with money, tax, and
> settlement as a small **fact subgraph** around it — because for an
> AI-reshapeable SME base, one navigable slice is the prime value, and
> cross-document settlement (not the table count) is what makes the hard money
> scenarios correct.

The rules it establishes:

- **One hub, three families.** `quote | sales_order | purchase_order` (commercial),
  `invoice | credit_note | receipt | bill` (fiscal), `goods_receipt | adjustment |
  transfer` (stock). The `family` is a **persisted column** (CHECK-linked to
  `type`); families differ in validation, immutability, and posting — enforced in
  `core`, structurally guarded in `db`.
- **Finalized fiscal docs are immutable** — lines, totals, tax, and identity freeze
  at finalize; only payment/posting/status columns advance. Corrections are
  `credit_note` successors, never edits.
- **Money is integer minor units** with a `core/money` value helper; round per line,
  header = exact Σ lines. (Reverses the `numeric → number` placeholder.)
- **Payments are facts; balances are projections.** A payment is a header +
  `payment_allocations` (one tender settles N documents); `amountPaid`/`balanceDue`/
  `entity.balance` are derived and **rebuildable** from the facts. Idempotency keys,
  signed reversals, and a `customer_credit` wallet (deposits / saldo a favor) are
  base, governed by **one conservation identity** `core` enforces.
- **The hub emits a domain-event spine**, not pack logic; packs subscribe. Stock,
  fiscal compliance, and GL are seams, never base tables.

## Options Considered

### One `documents` hub + money subgraph (chosen)

- **For:** one slice key an agent (and a human) can navigate and reshape; the money
  subgraph fixes the hard scenarios identically regardless of table count; the
  commercial-vs-financial split's benefits (immutability boundary, GL path) are
  kept as family discipline + a non-breaking promotion seam.
- **Against:** some columns are meaningless on commercial rows; immutability and
  family rules are conventions `core` must enforce — paid down with a persisted
  `family` column, a CHECK, and a fiscal view.

### Split commercial vs financial tables (rejected — kept as a future seam)

- **For:** the immutability boundary and anemic columns vanish; matches Odoo/SAP/
  Stripe; clean future GL path.
- **Against:** ~2× schema surface + a flow graph for an agent to navigate and
  reshape, for benefits the money subgraph already delivers. Recorded as a
  **non-breaking promotion seam**, not paid for now.

### Double-entry ledger / event-sourcing as the base (rejected)

- **Against:** right as a *seam* (a posting hook; rebuildable projections), wrong as
  the base — both cost legibility the template can't spend, on D1/SQLite at SME
  scale. The base ships no GL and keeps the event log a *side* log.

## Consequences

- The hard SME money flows (one transfer settling many invoices, advance deposits,
  returns to store credit, month-end AR) are **correct**, not worked around.
- New conventions `core` must own and test: the family discipline, the conservation
  identity, and projection rebuild. The schema under-advertises them, so the
  helpers and a structural `family` guard are load-bearing.
- The money customType changes from `numeric → number` to **integer minor units**;
  `AGENTS.md`'s money line and Catalog `price`/`cost` migrate when Transaction Core
  is built ([[ALW-299]]) — this ADR records the reversal; the migration is that task.
- A future financial/GL split is a seam, not a rewrite.

## Related Decisions

- [ADR-001](./001-monorepo-and-architecture.md) — the layer slicing this hub lives in.
- [ADR-004](./004-schema-sources-and-boundary-types.md) — `db` row types vs `contract` inputs the hub follows.
- Platform **ADR-0010 §E/§F** (parts list + event spine) and **ADR-0017** (pack registry) — the reconciled counterparts this implements.

## References

- [`docs/architecture/transaction-core.md`](../architecture/transaction-core.md) — the full hub spec, seams, and worked examples.
