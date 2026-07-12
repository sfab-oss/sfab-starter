# Adopting this template (agent guidance)

Suggested starting path for an AI agent helping someone turn this starter into
their product. This is **guidance**, not a required ritual — skip or reorder as
the conversation warrants. Stick to what is **in the repo today**; do not steer
the conversation around features, packs, or roadmaps that are not here yet.

For day-to-day work *inside* an already-adopted repo, use [`AGENTS.md`](../AGENTS.md)
and [`docs/architecture.md`](architecture.md). This file is about the first
pass: copy → understand → ask → plan → reshape.

## What you are looking at

What ships in this template now:

- **An AI-native foundation**, not a blank Vite app. Auth, multi-tenant orgs,
  and a durable per-org agent are load-bearing — keep them unless the user
  clearly wants a different foundation.
- **Catalog + documents** working end-to-end (products; quotes / orders /
  invoices with draft → finalize). This is the commercial base in the repo
  today. New product domains usually rename and extend what is here rather
  than replacing the pattern wholesale. Details:
  [`architecture/transaction-core.md`](architecture/transaction-core.md).
- **Layer-sliced, feature-keyed.** A capability is the same key across `db` →
  `contract` → `core` → surfaces → UI/agent. Find one slice, you know where the
  rest live. Full map: [`architecture.md`](architecture.md).

Prefer reading those docs over rediscovering structure from file trees.

## Drop `.sfab/` (public template only)

This clone may include a `.sfab/` folder. That is SFab **platform** scaffolding
(task mirrors, fabrication manifests). It is not part of the product you are
building, and adopters do not need anything inside it.

When a project is created through the factory, `.sfab/` is stripped
automatically. This public template cannot do that for you, so delete it early:

```bash
rm -rf .sfab
```

Do not edit files under `.sfab/` — remove the directory. Skip this step only if
you already know you are working inside a factory-managed project that still
needs the folder.

## Before you change much

Confirm the app actually runs for the user (or you) with the README getting
started steps. A broken clone is usually env/migrations, not architecture.

Then prefer a short **product** interview over diving into renames and
deletions. Assume the person you are talking to is a product or business owner
(technical-adjacent is fine) — ask about customers, workflows, and naming, not
about hubs, layers, or auth plugins. You translate their answers into a
technical plan afterward.

The goal is enough clarity to write a transform plan and execute it — not a
complete product brief, and not permission gates between phases.

### Write as you go (`docs/`)

Persist the adoption work in the repo so it survives the chat:

| File | What goes there |
| --- | --- |
| `docs/notes/YYYY-MM-DD-product-brief.md` (or similar under `docs/notes/`) | Interview Q&A in the user’s words — update as answers arrive |
| `docs/notes/YYYY-MM-DD-transform-plan.md` (separate file) | How you will reshape the **whole** app — brand, nav/copy, kept surfaces, new slices, **AI tools + system prompt**, seed/demo data, verify steps |

Do not keep the brief and the plan in one file. The brief is product context; the
plan is your execution checklist.

### When to stop and ask (business only)

**Be eager.** Once you have enough business context, write the plan and carry it
out without asking “should I continue to the next phase?” or pausing for
technical approval.

Stop and ask the user **only** when a **business / product** fact is unclear or
conflicting (who signs in, how they sell, what the AI must not do, product name,
what “done” means for v1). Do **not** stop for:

- Technical forks (schema shape, layer placement, which package owns X)
- Phase check-ins (“I finished branding — ready for the delivery board?”)
- Permission to keep coding after they already said to turn this into their
  product

If you must choose a technical default, pick the sensible default below, note it
in the plan, and keep going.

### Questions worth asking

These are a **starting checklist of unknowns**, not a fixed script. Shape and
order them as the conversation goes; skip anything already answered; ask
follow-ups in their words. If you need more **business** context to plan or
reshape confidently, ask — do **not** stop at this list’s length or wording.

Ask only what is still unknown. Phrase in plain language. Write each answer
into the product-brief file as you get it.

1. **What is this product?** — Only if still unclear from what they already
   said. In one sentence: what are they building, and what problem does it
   solve?
2. **Who uses the app on day one?** — Who signs in (role or persona)? Who does
   *not* (e.g. customers stay on phone/WhatsApp)? Solo, staff, or customers
   too?
3. **How does a real job run today?** — Walk one request from start → done →
   paid in their words (not “do you invoice?”). Correct a short guess if that
   helps.
4. **What should v1 make true?** — The one outcome that makes this feel like
   *their* product, not the starter. Scope from their priorities.
5. **What do we call it — and the main things in it?** — Product / business
   name, plus the words they use for customers, things sold, and jobs (so you
   rename toward their language).
6. **What should the assistant help with — and never do alone?** — First useful
   AI jobs; hard limits (especially money / irreversible actions).

If answers conflict at a product level (e.g. “solo tool” vs “invite my whole
company”), surface that before coding. Do **not** ask them to choose technical
forks; that is your job in the plan.

### How you translate answers (you, not them)

Map product answers onto what is **already in the codebase** when you draft the
plan:

| They said… | You tend to… |
| --- | --- |
| Sell products / services and issue quotes, orders, or invoices | Keep catalog + documents; rename language and fields toward their domain |
| Not commercial paperwork yet | Soft-pedal catalog/documents in the UI and copy; do not delete that code unless they insist |
| Teams, companies, or invites | Keep auth + organizations; tune copy and roles |
| “Make the AI useful for X” | Keep the org agent; retarget tools and context to their domain |
| New product name / brand | Bootstrap identity and copy early; leave stack choices alone |
| Hosting they already care about | Default to the shipped Cloudflare Workers setup unless they clearly need something else (large fork — flag early) |

Most of the shipped base stays useful even when v1 is a different workflow. Prefer
**keep + rename + extend** over deleting early — you rarely know what to strip
until later. What you must **not** do is leave the app half-demo: after reshape,
nav, copy, seed data, and the agent should speak their product, not “Acme /
Catalog / Documents.”

## A light path: answer → plan → transform

Not mandatory order — a shape that tends to work. Steps 3–8 run eagerly once
business questions are answered; do not gate each step on the user.

1. **Orient** — drop `.sfab/` if it is still present (see above), skim README
   (what ships), this file, then the architecture map. Open one end-to-end
   capability that exists today (e.g. catalog or documents) across layers so
   the feature-key pattern is concrete.
2. **Interview** — the questions above, one or a few at a time. Persist answers
   in the product-brief file under `docs/notes/`. Prefer decisions that unblock
   the first vertical slice over boiling the ocean.
3. **Plan (whole app)** — write the **transform plan** as its own file under
   `docs/notes/`. Cover the full product surface you will touch in this pass,
   not only the new home screen:
   - Brand / identity and demo framing
   - Nav + copy on **kept** surfaces (customers, catalog/jugs, documents/billing, …)
   - New or reshaped feature keys (full vertical slices)
   - **AI**: system prompt, which tools stay/change/add, what the agent must not do
   - Seed / sample data so the first run feels like their business
   - Verify steps
   Keep technical mapping in this file for you. A short product summary in their
   language is fine; do not ask them to approve layer choices.
4. **Bootstrap identity** — names, env/example copy, and obvious demo branding
   (small diff, high signal), then continue into the rest of the plan without
   waiting.
5. **Transform by feature keys** — add or reshape capabilities as full vertical
   slices (`db` / `contract` / `core` / Hono / agent tools / UI). Avoid inventing
   parallel folder schemes.
6. **Extend what is here** — prefer renaming and extending catalog/documents
   (and other shipped capabilities) over rewriting them for one vertical. See
   the transaction-core doc and the README for what the base actually includes.
   Finish the pass so nothing important still reads as the generic starter.
7. **Verify** — `pnpm typecheck`, targeted tests, and a smoke sign-in + core
   flow when env allows. Point the user at [`AGENTS.md`](../AGENTS.md) for the
   ongoing command / convention index.
8. **Hand back with a short tour** — in plain language, tell them what changed:
   what’s new, what was renamed (and that the old capabilities are still there),
   how the assistant behaves now, how to run/sign in, and what can wait for
   later. No architecture lecture — a friendly walkthrough of *their* app.

## Sensible defaults (when the user has not decided)

| Topic | Default unless they say otherwise |
| --- | --- |
| Auth + organizations | Keep |
| Built-in org agent | Keep; retarget tools/context to their domain |
| Catalog + documents | Keep; rename/extend rather than delete |
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
- Duplicate architecture ADRs into this file — link out instead.
- Edit or "clean up" files under `.sfab/` — delete the folder instead (see
  above).

## Pointers

| Need | Where |
| --- | --- |
| Clone / install / run / deploy | [`README.md`](../README.md) |
| Commands + conventions index | [`AGENTS.md`](../AGENTS.md) |
| Layer map + worked feature | [`docs/architecture.md`](architecture.md) |
| Transaction hub design | [`docs/architecture/transaction-core.md`](architecture/transaction-core.md) |
| How-tos | [`docs/guides/`](guides/) |
| Why a choice was made | [`docs/decisions/`](decisions/) |
