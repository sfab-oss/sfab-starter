# Candidate pack: Mexican SME operator UX

> Not the live app shell. The starter IA is Catalog / Entities / Documents
> (`apps/web/src/components/layout/platform-navigation.ts`). This note is a
> **candidate pack**: what a Mexican-SME operator pack would add on top of that
> generic worldwide ERP base. Language is i18n; country and vertical specifics
> are packs. The pack install mechanism (ADR-0010 / ADR-0017, `sfabKind: "pack"`)
> is **unbuilt** and lives on the roadmap — do not implement this shell, and do
> not add `/sell`, `/collect`, `/buy`, or `/people` routes to make it look live.

## On top of the generic base

The base already ships a country-neutral shell (home, catalog, entities,
documents, settings) over Transaction Core
([`transaction-core.md`](./transaction-core.md), [ADR-006](../decisions/006-transaction-core.md)).
A Mexican-SME operator pack would layer verb-first **surfaces** and MX-specific
document/money flows onto those primitives — not replace the taxonomy.

**Shell the pack would add (Spanish copy via i18n, not a forked IA):**

- Daily verbs in the sidebar: Hoy · Vender · Cobrar · Comprar (muted until AP)
- Personas as a contacts lens on Entities; Inventario as a stock lens on Catalog
- One Documents hub with Sell / Collect / Buy as **filter presets**, never
  per-type nav
- Mobile bottom tabs for the daily verbs; desktop `PrimaryActionBar` for
  *Nueva venta* / *Cobrar*
- Honest empty / coming-soon for anything without a capability — never invented data

**MX / SME specifics the pack would carry** (configured instances of Transaction
Core, never new base columns): CFDI / RFC / fiscal address metadata; fiado
(finalize separate from cobro; no fiado for a walk-in); wallet/anticipo as
customer credit; IVA as line-level tax; operator copy in Spanish.

**Surfaces the pack would compose** from existing UI primitives: documents hub
presets, fast cash-sale confirm, payment / allocate / wallet sheets, entity 360
(AR ≠ wallet ≠ credit limit; AP never on a customer 360). Money stays integer
minor units; never optimistic; never chat-committed.

RBAC (role-rank `owner > admin > operator`, `can(action)` seam) already lives in
`packages/auth` and is base, not pack.

## What this is not

This pack is not built. Do not treat this file as the app's information
architecture, and do not add routes to match the verbs above. Follow
`platform-navigation.ts` until a real `sfabKind: "pack"` install exists.
