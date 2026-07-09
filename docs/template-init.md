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

## Before you change much

Confirm the app actually runs for the user (or you) with the README getting
started steps. A broken clone is usually env/migrations, not architecture.

Then prefer a short **product** interview over diving into renames and
deletions. Assume the person you are talking to is a product or business owner
(technical-adjacent is fine) — ask about customers, workflows, and naming, not
about hubs, layers, or auth plugins. You translate their answers into a
technical plan afterward.

The goal is enough clarity to propose a plan — not a complete product brief.

### Questions worth asking

Ask only what is still unknown. Phrase these in plain language; adapt wording
to how they talk about their business.

1. **What is this product?** — In one sentence, what are you building? What
   problem does it solve?
2. **Who is it for?** — Who signs in on day one (role or persona)? Are there
   different kinds of users (e.g. staff vs customers, multiple companies)?
3. **What should feel “yours” first?** — Product name, look and feel, and the
   first screen or workflow that should no longer feel like a generic demo.
4. **How do people buy / bill / track work today?** — Do they sell products or
   services, quote and invoice, manage orders, or something else? You are
   learning whether their world maps to what already ships (things you sell +
   paperwork that moves through drafts → finalized) — not asking them about
   architecture.
5. **What is the AI assistant for?** — What should the built-in agent help with
   first (answer questions, draft something, find records, …)? What should it
   *not* do without a human?
6. **Who works together in the app?** — One company, many teams, invitations,
   roles? Stay concrete (“my ops team and my accountants”) rather than
   “organizations plugin.”
7. **First-version focus** — Of what they want, what matters in the first
   version they can use? (Scope from *their* priorities, not from a checklist of
   missing platform features.)
8. **The smallest win** — What is the first real outcome that would make this
   feel like *their* product, not the starter?

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

## A light path: answer → plan → transform

Not mandatory order — a shape that tends to work:

1. **Orient** — skim README (what ships), this file, then the architecture map.
   Open one end-to-end capability that exists today (e.g. catalog or documents)
   across layers so the feature-key pattern is concrete.
2. **Interview** — the questions above, one or a few at a time. Prefer decisions
   that unblock the first vertical slice over boiling the ocean.
3. **Plan** — write a short plan the user can approve in *their* language
   (product outcomes, names, first workflow). Keep technical mapping
   (keep/rename/strip, first capability key, what not to touch) in the same
   plan for you — not as questions they must answer.
4. **Bootstrap identity** — names, env/example copy, and obvious demo branding
   once the direction is clear (small diff, high signal).
5. **Transform by feature keys** — add or reshape capabilities as full vertical
   slices (`db` / `contract` / `core` / Hono / agent tools / UI). Avoid
   inventing parallel folder schemes.
6. **Extend what is here** — prefer renaming and extending catalog/documents
   (and other shipped capabilities) over rewriting them for one vertical. See
   the transaction-core doc and the README for what the base actually includes.
7. **Verify** — `pnpm typecheck`, targeted tests, and a smoke sign-in + core
   flow. Point the user at [`AGENTS.md`](../AGENTS.md) for the ongoing command /
   convention index.

## Sensible defaults (when the user has not decided)

| Topic | Default unless they say otherwise |
| --- | --- |
| Auth + organizations | Keep |
| Built-in org agent | Keep; retarget tools/context to their domain |
| Catalog + documents | Keep; rename/extend rather than delete |
| Cloudflare / D1 / Workers | Keep |
| UI system (`packages/ui`) | Keep primitives; change product components and copy |
| Example / demo framing | Soften toward their product name once known |

## What not to do by default

- Treat this as a throwaway scaffold and gut auth, orgs, or the agent "to
  simplify" without an explicit ask.
- Rewrite folder layout or invent a new layering story.
- Steer the init around capabilities that are not in the repo yet (or promise
  future add-ons). Work from what is here and what the user wants next.
- Dump a huge questionnaire up front or imply there is only one correct
  transformation sequence.
- Duplicate architecture ADRs into this file — link out instead.

## Pointers

| Need | Where |
| --- | --- |
| Clone / install / run / deploy | [`README.md`](../README.md) |
| Commands + conventions index | [`AGENTS.md`](../AGENTS.md) |
| Layer map + worked feature | [`docs/architecture.md`](architecture.md) |
| Transaction hub design | [`docs/architecture/transaction-core.md`](architecture/transaction-core.md) |
| How-tos | [`docs/guides/`](guides/) |
| Why a choice was made | [`docs/decisions/`](decisions/) |
