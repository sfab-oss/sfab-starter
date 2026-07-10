# Operator UX — app shell, surfaces, and build phases

> The buildable UX spec for the starter ERP base: the app shell, the operator
> surfaces, and the order they ship in. It sits on top of **Transaction Core**
> ([`transaction-core.md`](./transaction-core.md), [ADR-006](../decisions/006-transaction-core.md)) —
> TC is the **data + capability** layer; this is the **surfaces** layer that consumes it.
> This is the **target** design, not a description of what's built today (see §0).
> The money model is decided in ADR-006; the access-control model in §8 is tracked as a
> prerequisite task. House rule throughout: **every screen maps to a real capability;
> nothing is faked, nothing invented.**

## 0. Build-state reality (read this first)

Verified against the repo (2026-07-10). **Shipped & live:** org/auth/onboarding/settings;
catalog (products); entities; documents hub (draft → finalize / folio); pay-on-document
surfaces backed by `payments` / `payment_allocations` / `customer_credit` schema + core;
activity log; an org AI agent that reads catalog/documents/activity (money and document
mutations stay user-gated by convention); home landing with honest quick-links (no
fabricated metrics). **Still thin / coming-soon relative to this spec:** verb-first
Spanish shell (Hoy / Vender / Cobrar), wallet UI depth, multi-allocate, statement-ledger
polish, and some Phase-2 sheets.

The rest of this doc is still the **target** operator UX. Prefer §0 + the live routes over
older phase labels when they disagree. Anything not yet backed by a capability should
render as an **honest-empty / coming-soon** state — never invented data.

## 1. Product vision & principles

A **verb-first operator tool** for a busy SME owner: open the app and *run the day* — sell,
collect, see who owes you — not browse an ERP taxonomy. The bar is **minimal but
functional** (Linear/Vercel density, Midday's table/sheet patterns — patterns only; our
stack is TanStack Start + Hono RPC). The base is **country-neutral and prescriptive**:
good-practice operations (record deposits as liabilities, keep a running statement, snapshot
lines) ship on by default. Copy is Spanish over a neutral IA; the 3 pilots (water+ice,
trucking, coffee-trader) are *guiding ideas, not requirements*.

Cross-cutting rules that shape everything below:

- **One Documents hub, three families** — Sell/Collect/Buy are filter presets, never per-type nav.
- **Money is integer minor units** end-to-end; one `MoneyDisplay`/`MoneyField`. Three settlement axes (`status`/`paymentStatus`/`settlementStatus`) stay visually distinct.
- **Money is never optimistic, never chat-committed** — confirmed server writes; projections refetch from facts.
- **AR ≠ AP** — customer fiado balance and supplier bills never combine in one number.
- **Layer rule** — domain/router-coupled composites in `apps/web`; only generic primitives + a pure `MoneyDisplay` in `packages/ui` (never `core` in `ui`). This is the same boundary the `components-composition` skill enforces.

## 2. Information architecture & app shell

**Shell, re-skinned not rebuilt:** keep the `_protected` shell — left collapsible
sidebar + content outlet + **bottom AI agent dock**. No top nav, no `/agent` route, no
permanent right rail.

**Verb-first sidebar**, Spanish, grouped:

- **Mi día** — Hoy · Vender · Cobrar
- **Operación** — Inventario · Comprar *(muted/coming-soon)* · Personas
- footer — Ajustes + org switcher

**Density:** a big obvious **`PrimaryActionBar`** (*Nueva venta* / *Cobrar*) on operator
surfaces + mobile sticky CTAs; Linear-compact tables + **⌘K as a parallel accelerator**
elsewhere — ⌘K is never the only path nor the onboarding path.

**Command palette:** lifted to shell level, shares one `navigation-config` with the
sidebar. Scope phased: **Actions + Go-to now**, entity/doc search when the backend lands
(no faked results). ⌘K = deterministic nav + hero actions; the **agent** = questions /
analysis / drafts — no overlap.

**Agent placement:** bottom dock + mobile FAB + a sidebar-footer trigger;
`useSetPageContext` on every route. List routes mirror URL search params into
`page.view` so the org agent system prompt carries a lightweight view fingerprint
(IDs + query params only — never row payloads); the URL remains the source of
truth for shareable list state.

**Mobile:** a bottom tab bar owns the daily verbs on phone (Hoy · Vender · Cobrar ·
Inventario · Más) — never hide Sell/Collect behind a hamburger. **The bottom bar owns the
hero CTAs on phone; the sticky `PrimaryActionBar` is desktop/Hoy** (no double-up).

**Honest not-yet-built nav:** skeleton surfaces (Comprar, parts of Personas) are
**visible-but-muted**, routing to a coming-soon state — never a 404, never fake data.

## 3. Composition system — the component spine

Mostly **extraction of the proven inventory pattern** (validateSearch → React Query → Hono
→ `DataTable`; `contract/<cap>` Zod + `Field`/RHF forms), not a new library. All new
components follow the `components-composition` skill (cn/cva, Base UI `render`
composition, `data-slot`, the `packages/ui`-imports-no-`core` boundary).

**Convention baseline (already true in the starter — verified):**
`packages/ui/src/components/shadcn/button.tsx` is the canonical pattern (53 files use
`data-slot`): `cn` = `clsx` + `tailwind-merge` from `@workspace/ui/lib/utils`; variants via
`cva` defined outside the component, typed with `VariantProps`; composition via Base UI's
`render` prop (`@base-ui/react/button`, `useRender` + `mergeProps` for polymorphic
non-button parts) — **not** Radix `Slot`/`asChild`. Style in `components.json` is
`base-vega`.

### Primitives (`packages/ui`) — pure, never import `core`

| Piece | Status | Notes |
|---|---|---|
| shadcn/* (button, input, dialog, sheet, table, badge, popover, …) | EXISTS | The baseline; reuse, don't fork. |
| `cmdk` command palette | EXISTS (dep) | Lift to shell ⌘K. |
| `MoneyDisplay` (value + currencyCode, MoneyMinor-aware) | BUILD | Pure; kills the USD `Intl` hack at `inventory/index.tsx:251`. |
| `MoneyField` / `QuantityInput` / `DateInput` | BUILD | Validation wired in the app. |
| `DataTable` → extend to `ResourceTable` | EXTEND | Clone the proven inventory table. |
| Status-badge primitives | BUILD | Domain wrappers live in the app. |

### Composites (`apps/web`) — domain-aware

`FilterPresetBar`, `BulkActionBar` *(defer)*, `SideSheetHost` + `UrlSheet`,
`PrimaryActionBar`, `DocumentStatusBadge`/`PaymentStatusBadge`/`SettlementStatusBadge`/
`DocumentMetaChips`, `HonestEmptyState`/`ComingSoonPage`, `ContractForm` *(convention —
exists via `product-form.tsx`/`warehouse-form.tsx`)*, `ActivityTimeline` *(shell now, data
later)*, `DocumentsHubPage`, `DocumentEditor`/`DocumentRecord`/`DocumentLineGrid`,
`PaymentSheet`/`AllocateSheet`/`WalletSheet`/`ContactSheet`, the Entity-360 tiles,
`MasterDataListPage`.

**Surface rules:** full-page = indexes / editors / entity-360 / statements / line-grids ·
side-sheet = money / contact-pick / wallet (≤~6 fields) · dialog = small create + destructive
confirm · inline = projections + activity. **Write policy:** sonner success + AlertDialog for
finalize/void/reverse/discard; optimistic only for catalog — never money. **Density:**
comfortable on operator/money surfaces, compact opt-in.

## 4. Canonical route + sheet map

**Routes** (TanStack file routes under `_protected`):

```
/                         Hoy (overview)
/sell                     Documents hub — preset: direction=sales, families commercial+fiscal
/collect                  Documents hub — preset: sales fiscal, finalized, paymentStatus unpaid|partial, balanceDue desc
/buy                      Documents hub — preset: direction=purchase  (honest-empty/coming-soon; NO inventory redirect)
/documents                Documents hub — power view (not in sidebar)
/documents/$id            Document detail — ?variant=fast|full → DocumentEditor | DocumentRecord
/inventory                Catalog/stock — ?view=catalog|stock presets  (ONE nav entry)
/inventory/$id            Product detail
/inventory/warehouses     Warehouses (sub-route, not a top-level verb)
/people                   Contacts list (customers+suppliers)
/people/$entityId         Entity 360 / estado de cuenta
/settings                 Org/members/settings
/warehouse-setup          Onboarding helper (SHIPPED today; keep)
```

(Backend already shipped and reused by the editor's catalog picker: `GET /inventory/search`.)

**Sheets** — one global `SideSheetHost`, **namespaced params** (no collision with list
filters), **no stacking in v1**:

```
?sheet=payment   &sheetDocumentId=…                                              (v1)
?sheet=contact   &contactMode=pick|create|edit  &sheetDocumentId=…?              (v1)
?sheet=allocate  &sheetEntityId=…                                                (Pri-1)
?sheet=wallet    &walletMode=deposit|apply &sheetEntityId=… &sheetDocumentId=…?  (Pri-1)
?sheet=credit-note …                                                             (deferred, honest-disabled)
```

**Locked forks:** fast sale = `/documents/$id?variant=fast` only (no `/sell/new`, no
`?mode=fast`); fast payment is **inline in the confirm**, not a sheet.

## 5. Surface designs

### 5.1 Hoy / overview
Kill the fake dashboard. Layout: `PrimaryActionBar` (Nueva venta / Cobrar — muted pre-TC) →
**≤3 composite KPI tiles** (Low-stock · AR · Sales-today; AR + Sales honest-empty until TC +
`GET /dashboard/ar-metrics`) → action items ("X facturas por cobrar" → /collect; "Y
productos bajos" → /inventory) → a capped **"Movimientos de inventario"** feed (interim,
labeled — distinct from the document Activity timeline). No charts, no notification chrome.
(`getDashboardMetrics` should be an aggregated endpoint, not a full-product scan.)

### 5.2 Documents hub
One `DocumentsHubPage` rendering the preset routes above. Columns (preset-trimmed, ≤~7):
Cliente · Total (`MoneyDisplay`) · `PaymentStatusBadge` · Saldo (balanceDue) · Folio (link,
finalized only) · Fecha · type chip / `DocumentStatusBadge`. **Collect leads with Saldo
(balanceDue desc).** Rows read projection caches (never recompute/optimistic). Saved views =
preset routes + URL chips; extra filters in a "Más filtros" popover. Bulk hidden until
allocate ships. Entry: `PrimaryActionBar` (one *Nueva venta*, no per-type menu) + row
*Cobrar* → `?sheet=payment`. Empty: Collect "¡Todo cobrado!", Sell + CTA, honest-empty pre-TC.

### 5.3 Document detail & editor
One route, discriminated render: **`DocumentEditor` (variant fast|full)** + **`DocumentRecord`
(read-only)** — split at the immutability boundary, not one toggled form.

- **Draft editor:** header property grid (entity / `Mostrador` via `?sheet=contact`,
  currency, dates, series; folio "— Borrador" until finalize); `DocumentLineGrid` (catalog
  picker via `GET /inventory/search`; qty / `MoneyField` unitPrice / discount / taxRate;
  read-only line `taxAmount`; **line snapshot**); sticky `DocumentTotalsPanel`. Catalog float
  → minor units at pick.
- **Fast cash sale:** `?variant=fast` — **3 steps**: add products → "Cobrar y finalizar" +
  one `AlertDialog` showing the exact total → one atomic RPC (finalize → folio → critical
  stock → recordPayment) → read-only paid record + *Otra venta*. The atomic call
  **orchestrates** those steps in one transaction but still emits the distinct domain events
  `document_finalized` and `sale_completed` (§7 of `transaction-core.md`) — it does not merge
  the events or the underlying `core` commands. Payment captured **inline** (cash / full /
  default method). One confirm, not zero.
- **fiado:** full editor; *Finalizar* separate from *Cobrar*; requires a customer before
  finalize (no fiado for a walk-in).
- **Finalize:** AlertDialog → `core.finalize`; folio appears on success; fiscal lines/totals
  freeze; corrections via credit-note/void successors (muted "Próximamente" in v1).
- **`DocumentRecord`:** receipt layout, three distinct badges, projection `amountPaid`/
  `balanceDue`, inline payment list, *Cobrar* → `?sheet=payment`. Lineage = inline header
  links (no graph). Tabs Detalle | Actividad (shell) | Adjuntos (gap) on full/record only.
  Imprimir/PDF honest-disabled (gap).

### 5.4 Settlement sheets
On the one `SideSheetHost`; Cobrar-later only (fast sale is inline).

- **`PaymentSheet`** (v1): context strip (folio · cliente · total · pagado · **saldo**),
  `MoneyField` (default balanceDue), open-string method, paidAt, reference, hidden
  idempotencyKey; full/partial; `core.recordPayment` confirmed + refetch. Fiscal-sales only.
- **`AllocateSheet`** (Pri-1): entity open-receivables grid, **oldest-first auto-allocate
  (toggleable)**, sticky **remainder bar (exacto/falta/sobra)**, submit gated on remainder;
  one atomic `recordPayment({header, allocations[]})`.
- **`WalletSheet`** (Pri-1): deposit → `customer_credit` **only** (never AR); apply →
  min(credit, balanceDue) onto an invoice.
- **Reversal** (Pri-2): summary + AlertDialog → compensating row.
- **Guardrails:** allocations fiscal-sales only; overpay → wallet or reject by ONE core
  policy (never silent AR); deposits → wallet first; reversal = compensating row; no optimistic.

### 5.5 Entity 360 / estado de cuenta
`/people/$entityId`, full-page read surface over projection caches. Header: **three distinct
tiles** — Debe (AR) · saldo a favor (wallet) · límite — never merged. Body: open-receivables
table (fiscal-sales only — the **shared `OpenReceivablesTable`** also used by Collect, one
column set). Money via the §5.4 sheets (row *Cobrar* → payment; header *Cobrar* → allocate;
deposit/apply → wallet). **Credit-limit soft in v1** (amber meter + fiado hint; hard block
Pri-2 — and now role-gated, see §8). **AP never on a customer 360.** **History = three
distinct views on one fact source:** per-doc payment list inline (record) · entity "Estado de
cuenta" statement ledger (Pri-1) · Activity timeline (data later) — no fourth surface.
Statement export = print-CSS only (PDF gap).

### 5.6 Contacts & catalog
Two master-data surfaces on one shared `MasterDataListPage` spine.

- **`/people`:** `ResourceTable` — Nombre · Rol chips · **Debe** (customers) · **Por pagar**
  (suppliers, muted until AP) · Saldo a favor · Contacto · **Límite** (customers); presets
  Todos/Clientes/Proveedores/Con saldo; row → Entity 360. Entity = one record, **dual role**
  (`isCustomer`/`isSupplier` booleans). **`ContactSheet`** (`?sheet=contact`, pick|create|edit)
  serves list-create, 360-edit, and editor-attach; pick has a **Mostrador** walk-in row; no
  opening-balance entry.
- **`/inventory`** (SHIPPED — align): refactor to `ResourceTable` + **`MoneyDisplay`**, **kill
  the USD `Intl` hack** (`inventory/index.tsx:251-254`), add **cost** to the form. One route,
  `?view=catalog|stock` presets, manual stock labeled "ajuste manual (interino)". **No
  product-level tax UI** (tax is line-level); no `tracksInventory` toggle until the column
  exists. CSV import = honest-disabled gap. Coffee provenance = `metadata` seam only (no
  bespoke columns). RFC / fiscal address = CFDI-pack metadata, not base.

### 5.7 AI agent surface
Bottom dock + page-context on every route. **Capability tiers:** read = free; low-stakes
catalog write = `needsApproval` in-chat (shipped); **money & documents = prepare-only** — the
agent returns a `PaymentIntentCard` / `DocumentDraftCard` that **deep-links into the same
UrlSheet / editor** for human verify+submit (idempotencyKey bound at submit); **forbidden in
chat:** executable recordPayment/finalize/reverse. No duplicate money mutation path
(deep-link, not parity tools). Agent capability is **intersected with the user's role** (§8) —
the agent is never a way to exceed your own permissions. **Narrow the agent system prompt to
the shipped tool scope** until TC tools land.

## 6. Access control (RBAC)

Role-based access surfaced from the credit-limit decision (§9.4) and was promoted to an
**early prerequisite that also informs the UX**: gates change what each role *sees and can
do*, so the surfaces above must consume the gate rather than retrofit it. Tracked as a
dedicated task that **blocks the Transaction Core build**.

**Verified ground truth (better-auth 1.5.2):** roles already ship — `member.role`
(`owner`/`admin`/`member`) at `packages/db/src/schema/auth.ts:51`, used today only in a
**client-side** check in the invite form. There is **no server-side authz** beyond
logged-in + active-org (`apps/web/src/hono/middleware/auth.ts`). The access-control engine
(`createAccessControl`, `hasPermission` server-side, `checkRolePermission` client-side,
network-free) is **built in** — so the gate is largely *configured*, not built.

**Decisions (locked):**

| # | Decision |
|---|----------|
| 1 | **Role-rank, not a fine-grained matrix.** `owner > admin > operator`. No end-user permission-config UI. |
| 2 | **Three fixed tiers.** Reuse better-auth's trio; "operator" = `member` renamed in **UI copy only** (no schema change). |
| 3 | **Fixed roles — `dynamicAccessControl` OFF.** Orgs assign people to fixed roles; cannot invent roles at runtime. |
| 4 | **Single `can(action, ctx)` seam.** Role-rank under the hood; call sites read `can("payment:reverse")`, not `role === "admin"`. Build on `hasPermission`/`checkRolePermission`, not a parallel engine. |
| 5 | **Server-side enforcement.** A `requireRole`/`requirePermission` Hono guard alongside `requireAuth`/`requireActiveOrg`, before the handler — closes today's client-only gap. |
| 6 | **Four v1 gates** (operator blocked / admin+ allowed): (1) **credit-limit bypass** — operator hard-blocked, admin+ "Acepto/Continuar"; (2) **agent low-stakes catalog writes** — chat-approve only if the caller's role may make that edit; money/docs never executed from chat; (3) **money reversals / voids** — admin+; (4) **org settings & member management** — admin+, server-enforced. |
| 7 | **UI affordance:** gated controls render honest disabled/explained for operators (not hidden-and-broken); admin credit bypass = confirm dialog. |

**Deferred:** extra tiers (viewer/cashier/accountant), teams, org-defined custom roles, any
fine-grained permission editor — revisit only if a pilot demands it.

## 7. Capability coverage

- **LIVE today:** catalog CRUD + search; entities; documents hub (create/edit/finalize);
  pay-on-document; activity log; org AI agent (read + gated catalog tools); org/auth/settings.
- **Designed / partial vs this spec:** fast cash-sale flow, fiado UX depth, Entity 360 polish,
  soft credit-limit meter, verb-first Spanish nav.
- **Pri-1 (designed, next):** multi-allocate (`AllocateSheet`), wallet/anticipo
  (`WalletSheet`), statement-ledger depth.
- **Deferred / framed / gap:** quote chain, credit notes, payment reversal UI, AP/Buy,
  stock-family docs, global entity/doc search backend, file attach / File Hub (§9), PDF/print,
  agent intent cards.

Every job has a home; nothing is orphaned. Gaps render honest-disabled.

## 8. Build phases

> **Owner constraints folded in:** tablet-primary + phone supported, desktop secondary →
> **responsive is Phase 1, not deferred**; one-confirm cash sale; single payment first,
> allocate + wallet are Pri-1; credit limits + agent writes are **role-gated** → the **RBAC
> spine is an early prerequisite** that **blocks the TC build**.

- **Phase 0 — shell honesty + RBAC spine (no TC):** kill fake Hoy + wire live inventory
  metrics; verb/Spanish nav + `navigation-config`; `PrimaryActionBar`, `MoneyDisplay`/
  `MoneyField`, `ResourceTable`/`FilterPresetBar`, `SideSheetHost`, status-badge shells,
  shell-level ⌘K — **all responsive (tablet/phone first-class)**; refactor `/inventory` to
  `MoneyDisplay` + add cost; stub routes with `HonestEmptyState`/`ComingSoonPage`; narrow the
  agent prompt. **RBAC spine** — role on the membership, a shared `can(...)` guard used by
  both server (contract/core) and UI (show/disable/explain), so Phase-1 surfaces consume it
  natively. *Phase 0 depends on the RBAC spine, not on the TC backend.*
- **Phase 1 — TC hero:** `DocumentsHubPage`; `DocumentEditor`/`DocumentRecord`/
  `DocumentLineGrid`; `PaymentSheet`; `ContactSheet`; minimal Entity 360 + shared
  `OpenReceivablesTable`; live `ArSummaryTile`; `ActivityTimeline` shell → **fast sale + fiado
  + cobro + Collect + who-owes-me**. Credit-limit gate uses RBAC (admin bypass with
  "Acepto/Continuar"; lower roles hard-blocked). **Mobile bottom-tab-bar + sticky CTAs land
  here** (tablet/phone primary). *Depends on the TC backend **and** the RBAC spine.*
- **Phase 2 — Pri-1:** `AllocateSheet`, `WalletSheet`, statement ledger, activity data, soft
  credit-limit meter refinements, richer role tiers if needed.
- **Deferred:** quote chain, credit notes, AP/Buy, stock-family docs, PDF, file attach, agent
  intent cards, global entity/doc search.

## 9. Resolved decisions

Resolved with the owner; binding for this spec. None changed the architecture; one (credit
limits) surfaced the RBAC requirement in §6.

1. **Device:** tablet-primary, phone fully supported, desktop secondary; responsive done
   properly throughout (no desktop-only layouts). The responsive bottom-tab-bar + sticky CTAs
   move into Phase 1.
2. **Cash-sale speed:** one confirm showing the exact total (no one-tap, no undo-window).
3. **Settlement order:** single payment first; multi-allocate + wallet/anticipo as the
   immediate next cut (Pri-1). The B2B-first reordering is not taken.
4. **Credit limits → role-gated:** everyone sees the over-limit warning; admin+ can bypass
   ("Acepto/Continuar"); lower roles are hard-blocked. Supersedes the earlier "soft warning
   only." This is what surfaced RBAC (§6).
5. **Agent writes → role-gated:** chat-approve allowed for low-stakes catalog/inventory edits,
   but only what the *current user's role* may itself make; money/documents always hand off to
   the real screen.

## 10. Open / deferred — not decided

- **File Hub / file components.** Not in this spec today. File Hub is a Tier-1 part; file
  attach is deferred. The AI elements exist (`packages/ui/src/ai-elements`) but there is **no
  file surface** (`FileDropzone`/`FileList`/`FilePreview`/`FileEditor` + an attach seam on
  `documents`/`entity` via the TC `metadata` seam). Powerful for the auditability/provenance
  pilots (PO scans, freight BOLs, coffee certs) but adds a storage+viewer surface. **Open
  question:** in scope for v1, or deferred with file-attach? Captured, not decided.

## Honest demo script (~8 min)

(1) Hoy real stock tiles → (2) low-stock drill → (3) agent "¿qué está bajo?" → (4) Nueva
venta fast path + one confirm → (5) paid record + stock decremented → (6) Collect →
`PaymentSheet` cobro → (7) Entity 360 row *Cobrar* → (8) AR tile updates. Pre-TC, the demo
stops at steps 1–3 with muted CTAs + honest copy — never placeholder KPIs.

## References

- [`transaction-core.md`](./transaction-core.md) + [ADR-006](../decisions/006-transaction-core.md) — the data/capability layer these surfaces consume (money subgraph, projections, event spine, seams).
- The `components-composition` skill (`.agents/skills/components-composition/`) — the house rules every component here follows.
- Current vertical surface this generalizes: `apps/web/src/routes/_protected/inventory/`, `packages/core/src/{products,warehouses,search}.ts`, `packages/db/src/schema/inventory.ts`.
