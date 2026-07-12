# Adopting this template (intake contract)

Machine-readable contract for turning this starter into a product. Two consumers
share **one** question set, **one** product-brief shape, and **one**
brief→task-slate mapping — do not fork guidance per surface.

| Consumer | When | Who is interviewed |
| --- | --- | --- |
| **In-repo adopting agent** | After clone / fabrication, reshaping the working tree | Product owner (or technical-adjacent) in the agent chat |
| **Platform pre-fabrication intake** | Before / at project confirm, before the repo exists | Same human, via the platform chat intake |

Day-to-day work *inside* an already-adopted repo: [`AGENTS.md`](../AGENTS.md) and
[`docs/architecture.md`](architecture.md). This file is only the first pass:
orient → interview → brief → slate / plan → reshape.

Stick to what is **in the repo today**. Do not steer around features, packs, or
roadmaps that are not here yet.

## Source of truth (ALW-591)

> This file (`docs/template-init.md`) is the **template-owned** intake contract.
> The platform does **not** own a copy. Platform intake / fabricate read it from
> the template repository at the **pinned template commit** — the `ref` field
> written into the fabricated project's `.sfab/template.json` at scaffold time
> (see [`.sfab/README.md`](../.sfab/README.md); this template repo itself has no
> live `template.json`, only `template.example.json`).

Decision recorded with ALW-591 (design, 2026-07-12): template-owned contract;
platform consumes at pinned ref. Downstream consumers of *this* contract (not
implemented here): fabricate tool (ALW-600), intake agent behavior (ALW-601).

## What ships today (honest inventory)

- **AI-native foundation** — auth, multi-tenant orgs, durable per-org agent.
  Keep unless the user clearly wants a different foundation.
- **Catalog + documents** end-to-end (products; quotes / orders / invoices with
  draft → finalize). Commercial base in the repo today. New domains usually
  rename and extend this pattern:
  [`architecture/transaction-core.md`](architecture/transaction-core.md).
- **Layer-sliced, feature-keyed** — same capability key across `db` → `contract`
  → `core` → surfaces → UI/agent. Map: [`architecture.md`](architecture.md).

Prefer those docs over rediscovering structure from file trees.

## `.sfab/` — public clone vs factory-managed

`.sfab/` is platform scaffolding. Behavior depends on how the tree was created:

| Tree | What to do |
| --- | --- |
| **Public template clone** (no factory provenance) | Adopters do not need `.sfab/`. Delete it early: `rm -rf .sfab`. Do not edit files under it — remove the directory. |
| **Factory-managed / fabricated project** | **Keep** `.sfab/`. Fabricate injects `.sfab/template.json` with the pinned template `ref` the platform depends on; it does **not** strip the folder. Never delete `.sfab/` or `template.json` during reshape. |

How to tell: if `.sfab/template.json` exists with a `ref`, treat the tree as factory-managed and keep the folder. If you only see template scaffolding without a live `template.json` (this public repo’s situation), public-clone rules apply.

## Product brief contract

### Authoritative home

| Stage | Home | Writer |
| --- | --- | --- |
| Pre-repo (platform path) | **Platform project document** | Intake agent at **confirm** |
| In-repo | `docs/notes/YYYY-MM-DD-product-brief.md` | First reshape run (seeds from platform doc) **or** adopting agent during interview |

**Handoff rule:** the platform project document is authoritative **until the
first seed** into the repo. After
`docs/notes/YYYY-MM-DD-product-brief.md` is written, that file is the **working
copy** for reshape unless someone intentionally re-syncs from the platform
document. Do not silently maintain two truths. Conventions:
[`docs/notes/README.md`](notes/README.md).

### Repo mirror lifecycle

1. **Platform path** — intake fills the brief → confirm writes the platform
   project document → emit the initial task slate from the mapping → fabricate
   creates the repo (brief is *not* required to land in the tree at scaffold).
2. **First reshape run** — read the platform brief → seed
   `docs/notes/YYYY-MM-DD-product-brief.md` with the same fields (handoff:
   repo becomes working copy) → write
   `docs/notes/YYYY-MM-DD-transform-plan.md` aligned to the slate.
3. **In-repo-only path** — no platform document: interview into the brief file
   directly, then write the transform plan and execute (ALW-568 eager path).

Keep brief and transform plan in **separate** files. The brief is product
context (stable fields). The plan is the execution checklist derived from the
brief + translation table.

### Shape (stable fields)

Agents parse these **exact** heading keys under the brief file / platform
document. Values are plain text (or the nested bullets under `naming` /
`assistant`). Omit a field only if still unknown; do not invent placeholders.

```markdown
# Product brief

## meta
- brief_version: 1
- source: platform | in-repo
- confirmed_at: <ISO-8601 or empty>
- template_ref: <40-char SHA when known, else empty>

## product_one_liner
<one sentence: what they are building and the problem it solves>

## day_one_users
<who signs in; who does not; solo / staff / customers>

## job_flow
<one real request from start → done → paid, in their words>

## v1_outcome
<the one outcome that makes this feel like *their* product>

## first_impression
<highest user-visible win for the first reshape pass — drives the foreground task>

## naming
- product_name: <>
- customer_term: <>
- sold_term: <>
- job_term: <>

## assistant
- help_with: <>
- never_alone: <>

## commercial_mode
<keep_catalog_documents | soft_pedal_catalog_documents | explicit_strip_requested>

## notes
<optional freeform; conflicts, out-of-scope, hosting constraints>
```

`commercial_mode` is set by the interviewer from answers (not asked as jargon):
default `keep_catalog_documents`; use `soft_pedal_catalog_documents` when they
are not doing commercial paperwork yet; `explicit_strip_requested` only if they
insist on deleting that code.

`first_impression` may equal `v1_outcome` when they are the same; spell it out
when the highest-visibility win is a slice of v1 (e.g. brand + one board).

## Interview

Guidance, not a rigid script — but **one question at a time**, especially on the
platform intake. Skip anything already answered. Phrase in plain language
(customers, workflows, naming — not hubs, layers, or auth plugins). Write each
answer into the brief fields as it arrives.

### Flow rules (both consumers)

1. Ask **one** primary question per turn (a short clarifying follow-up in the
   same turn is fine).
2. Prefer the **smallest win that unblocks reshape** over a complete product
   spec.
3. Order for signal, not completeness (see question list). Reorder if the human
   leads elsewhere.
4. Stop when stop conditions are met — enough to start ≠ complete brief.
5. If product-level answers conflict (e.g. “solo tool” vs “invite my whole
   company”), surface that before confirm / coding. Do **not** ask them to
   choose technical forks.

### Questions (ordered)

Map each answer into the field in the right column.

| # | Ask (plain language) | Brief field |
| --- | --- | --- |
| 1 | **What is this product?** One sentence: what are they building, and what problem does it solve? (Skip if already clear.) | `product_one_liner` |
| 2 | **What do we call it — and the main things in it?** Product / business name; their words for customers, things sold, and jobs. | `naming` |
| 3 | **What should v1 make true?** The one outcome that makes this feel like *their* product, not the starter. | `v1_outcome` (+ draft `first_impression`) |
| 4 | **Who uses the app on day one?** Who signs in? Who does *not*? Solo, staff, or customers too? | `day_one_users` |
| 5 | **How does a real job run today?** One request from start → done → paid in their words. | `job_flow` |
| 6 | **What should the assistant help with — and never do alone?** First useful AI jobs; hard limits (especially money / irreversible actions). | `assistant` |

Set `commercial_mode` from #1/#3/#5 without a separate jargon question.

### Stop conditions (enough to start)

**Minimum to confirm / leave interview and produce a slate:**

- `product_one_liner`
- `naming.product_name`
- `v1_outcome` (and a concrete `first_impression`)
- `day_one_users` at least enough to know who signs in

**May defer** (fill later or use sensible defaults):

- Full `job_flow` detail beyond a sketch
- `assistant.never_alone` specifics (default: never finalize money / irreversible actions alone — see defaults table)
- Polish under `notes`

Platform intake: once the minimum is met, offer confirm rather than continuing
the questionnaire. In-repo agent: once the minimum is met, write the transform
plan and execute eagerly (below) — do not keep interviewing for completeness.

### When to stop and ask (business only)

**Be eager** after the brief is good enough. Carry out the plan without asking
“should I continue to the next phase?” or pausing for technical approval.

Stop and ask **only** when a **business / product** fact is unclear or
conflicting. Do **not** stop for technical forks, phase check-ins, or permission
to keep coding after they already said to turn this into their product.

If you must choose a technical default, pick from the defaults table, note it in
the plan, and keep going.

## How you translate answers (you, not them)

Map brief fields onto what is **already in the codebase** when drafting the
plan / slate:

| Brief signal | You tend to… |
| --- | --- |
| `commercial_mode: keep_catalog_documents` | Keep catalog + documents; rename language and fields toward their domain |
| `commercial_mode: soft_pedal_catalog_documents` | Soft-pedal catalog/documents in the UI and copy; do not delete that code unless `explicit_strip_requested` |
| `day_one_users` mentions teams / companies / invites | Keep auth + organizations; tune copy and roles |
| `assistant.help_with` set | Keep the org agent; retarget tools and context to their domain |
| `naming.product_name` set | Bootstrap identity and copy early; leave stack choices alone |
| Hosting constraint in `notes` | Default to shipped Cloudflare Workers unless they clearly need something else (large fork — flag early) |

Most of the shipped base stays useful even when v1 is a different workflow.
Prefer **keep + rename + extend** over deleting early. After reshape, nav, copy,
seed data, and the agent must speak their product — not “Acme / Catalog /
Documents.”

## Brief → initial task slate

Produce an initial reshape **task slate** mechanically from a filled brief.
Slate shape (ALW-591):

| Slot | Count | Rule |
| --- | --- | --- |
| **Foreground** | Exactly **one** | Highest user-visible value — title/body from `first_impression`, scoped so a single pass can land it |
| **Background** | One or more | Everything else needed for a coherent whole-app pass, ordered by dependency |

### Mapping rules (deterministic)

Given a brief, emit tasks in this order. Skip a row only when its **When** is
false. Titles are templates — substitute `naming.*` and `first_impression`.

| Order | Slot | Task title template | When (brief-field predicate only) | Body must cover |
| --- | --- | --- | --- | --- |
| 1 | Foreground | `First impression: {first_impression}` | `first_impression` non-empty | Brand touch only as needed for this win; the one vertical / surface that makes v1 feel real; verify steps for that win |
| 2 | Background | `Bootstrap identity: {product_name}` | `naming.product_name` non-empty | Env/example copy, demo framing, product name in chrome |
| 3 | Background | `Rename domain language ({customer_term} / {sold_term} / {job_term})` | any of `naming.customer_term` / `naming.sold_term` / `naming.job_term` is set and ≠ starter default (`customer` / `product` / `document`) | Nav + copy on **kept** surfaces; field labels toward their words |
| 4 | Background | `Retarget org agent for {product_name}` | `assistant.help_with` non-empty | System prompt; tools stay/change/add; enforce `assistant.never_alone` (use defaults table if `never_alone` empty) |
| 5 | Background | `Soft-pedal catalog/documents in UI` | `commercial_mode` equals `soft_pedal_catalog_documents` | Hide or de-emphasize in nav/copy; do not delete schema/core |
| 6 | Background | `Seed demo data for {product_name}` | `naming.product_name` non-empty | Sample rows so first run feels like their business |
| 7 | Background | `Whole-app copy pass (no starter demo framing left)` | always | Remaining Acme/Catalog/Documents strings; hand-back tour notes |

No absorb / skip exceptions outside the **When** column. Two agents given the same
brief must emit the same slate.

Each task stays a full vertical where code changes: `db` / `contract` / `core` /
surfaces / agent / UI as needed — no parallel folder schemes.

### Worked example

Sample brief (filled):

```markdown
# Product brief

## meta
- brief_version: 1
- source: platform
- confirmed_at: 2026-07-12T18:00:00.000Z
- template_ref: 5e58b98aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa

## product_one_liner
AquaRoute helps office managers schedule bottled-water jug deliveries and get
paid monthly without spreadsheet chaos.

## day_one_users
Owner and dispatch staff sign in. End customers stay on WhatsApp / phone — they
do not get accounts in v1.

## job_flow
Office requests jugs → dispatcher schedules a delivery → driver delivers →
office is invoiced on a monthly cycle.

## v1_outcome
Dispatcher can see today's deliveries and mark them delivered.

## first_impression
AquaRoute-branded "Today's deliveries" board: list today's jobs, mark delivered.

## naming
- product_name: AquaRoute
- customer_term: account
- sold_term: jug
- job_term: delivery

## assistant
- help_with: draft tomorrow's delivery list from open requests; summarize overdue accounts
- never_alone: never send or finalize an invoice; never mark a delivery delivered without confirmation

## commercial_mode
keep_catalog_documents

## notes
Keep Cloudflare hosting. Customers will not sign in for v1.
```

Exact task slate this brief yields (predicate replay):

| Row | When predicate | Result |
| --- | --- | --- |
| 1 | `first_impression` non-empty | emit — First impression: AquaRoute-branded "Today's deliveries" board: list today's jobs, mark delivered. |
| 2 | `naming.product_name` non-empty | emit — Bootstrap identity: AquaRoute |
| 3 | `account`/`jug`/`delivery` ≠ `customer`/`product`/`document` | emit — Rename domain language (account / jug / delivery) |
| 4 | `assistant.help_with` non-empty | emit — Retarget org agent for AquaRoute |
| 5 | `commercial_mode` equals `soft_pedal_catalog_documents` | **skip** (`keep_catalog_documents`) |
| 6 | `naming.product_name` non-empty | emit — Seed demo data for AquaRoute |
| 7 | always | emit — Whole-app copy pass (no starter demo framing left) |

| # | Slot | Title |
| --- | --- | --- |
| 1 | Foreground | First impression: AquaRoute-branded "Today's deliveries" board: list today's jobs, mark delivered. |
| 2 | Background | Bootstrap identity: AquaRoute |
| 3 | Background | Rename domain language (account / jug / delivery) |
| 4 | Background | Retarget org agent for AquaRoute |
| 5 | Background | Seed demo data for AquaRoute |
| 6 | Background | Whole-app copy pass (no starter demo framing left) |

Catalog + documents stay; language moves toward accounts / jugs / deliveries /
invoices via tasks 3 and 6.

## Platform path: interview → confirm → slate → fabricate

Sequence for the **platform pre-fabrication intake** (ALW-591 / ALW-601). Parallel
to the in-repo path; same brief fields and mapping rules.

1. **Interview** — questions above, one at a time; write answers into the brief
   shape (held on the platform until confirm).
2. **Stop at minimum** — when stop conditions are met, offer confirm rather than
   continuing the questionnaire.
3. **Confirm** — write the authoritative **platform project document** (product
   brief) at confirm.
4. **Emit slate** — run the brief→task-slate mapping on that brief; attach /
   store the slate with the project (intake concern — do not wait for first
   reshape to invent it).
5. **Fabricate** — scaffold the repo from the pinned template `ref`. Fabricate
   keeps `.sfab/` and writes `.sfab/template.json`; it does not seed `docs/notes/`
   from the brief (that is the first reshape run’s job).

## In-repo path: answer → plan → transform

Not mandatory order — a shape that tends to work. After the brief meets stop
conditions, steps 3–8 run eagerly; do not gate each step on the user.

1. **Orient** — apply [`.sfab/` rules](#sfab--public-clone-vs-factory-managed)
   (public clone may delete; factory-managed **must keep**, especially
   `template.json`). Skim README, this file, then the architecture map. Open one
   end-to-end capability that exists today (e.g. catalog or documents) across
   layers so the feature-key pattern is concrete.
2. **Interview / seed** — if a platform brief exists, seed
   `docs/notes/YYYY-MM-DD-product-brief.md` from it (repo becomes working copy).
   Otherwise interview into that file, one question at a time.
3. **Plan (whole app)** — write the **transform plan** as its own file under
   `docs/notes/`. Cover the full product surface for this pass:
   - Brand / identity and demo framing
   - Nav + copy on **kept** surfaces
   - New or reshaped feature keys (full vertical slices)
   - **AI**: system prompt, tools stay/change/add, hard limits
   - Seed / sample data
   - Verify steps
   Align plan sections with the task slate (use the platform-emitted slate when
   present; otherwise derive it from the mapping); technical mapping stays in
   this file.
4. **Bootstrap identity** — names, env/example copy, obvious demo branding, then
   continue without waiting.
5. **Transform by feature keys** — add or reshape capabilities as full vertical
   slices. Avoid inventing parallel folder schemes.
6. **Extend what is here** — prefer renaming/extending catalog/documents (and
   other shipped capabilities) over rewriting them for one vertical. Finish so
   nothing important still reads as the generic starter.
7. **Verify** — `pnpm typecheck`, targeted tests, and a smoke sign-in + core flow
   when env allows. Point the user at [`AGENTS.md`](../AGENTS.md) afterward.
8. **Hand back with a short tour** — plain language: what’s new, what was
   renamed, how the assistant behaves, how to run/sign in, what can wait. No
   architecture lecture.

Before you change much: confirm the app runs (README getting started). A broken
clone is usually env/migrations, not architecture.

## Sensible defaults (when the user has not decided)

| Topic | Default unless they say otherwise |
| --- | --- |
| Auth + organizations | Keep |
| Built-in org agent | Keep; retarget tools/context to their domain |
| Catalog + documents | Keep; rename/extend rather than delete |
| `assistant.never_alone` | Never finalize money movements or other irreversible actions without confirmation |
| Cloudflare / D1 / Workers | Keep |
| UI system (`packages/ui`) | Keep primitives; change product components and copy |
| Example / demo framing | Replace with their product name and domain language in this pass |

## What not to do by default

- Treat this as a throwaway scaffold and gut auth, orgs, or the agent "to
  simplify" without an explicit ask.
- Leave the app half-transformed (new home + old “Catalog / Documents / Acme”
  everywhere else, or an agent prompt still aimed at the demo).
- Stop between phases to ask whether you should continue — only stop for
  unclear **business** context.
- Ask the user technical questions you should decide in the plan.
- Rewrite folder layout or invent a new layering story.
- Steer the init around capabilities that are not in the repo yet (or promise
  future add-ons). Work from what is here and what the user wants next.
- Dump a huge questionnaire up front or imply there is only one correct
  transformation sequence.
- Fork this contract into a platform-owned copy — read this file at the pinned
  template `ref` instead (ALW-591).
- Duplicate architecture ADRs into this file — link out instead.
- Delete `.sfab/` (or `template.json`) in a factory-managed project — that is
  provenance, not clutter. Public clones may remove the folder; see
  [`.sfab/` rules](#sfab--public-clone-vs-factory-managed).

## Pointers

| Need | Where |
| --- | --- |
| Clone / install / run / deploy | [`README.md`](../README.md) |
| Commands + conventions index | [`AGENTS.md`](../AGENTS.md) |
| Layer map + worked feature | [`docs/architecture.md`](architecture.md) |
| Transaction hub design | [`docs/architecture/transaction-core.md`](architecture/transaction-core.md) |
| Product-brief / plan file conventions | [`docs/notes/README.md`](notes/README.md) |
| Fabrication / template `ref` provenance | [`.sfab/README.md`](../.sfab/README.md) |
| How-tos | [`docs/guides/`](guides/) |
| Multi-language UI | [`docs/guides/i18n.md`](guides/i18n.md) + `.agents/skills/i18n` |
| Why a choice was made | [`docs/decisions/`](decisions/) |
