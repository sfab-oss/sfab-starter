# `docs/notes/` — adoption artifacts

Working notes from **template adoption / reshape**, not durable architecture
knowledge. Architecture, ADRs, and guides stay in their buckets
([ADR-005](../decisions/005-documentation-and-knowledge-layer.md)).

The intake contract that defines *what* these files contain:
[`docs/template-init.md`](../template-init.md).

## What belongs here

| File pattern | Role |
| --- | --- |
| `YYYY-MM-DD-product-brief.md` | Product brief mirror — stable fields from the intake interview |
| `YYYY-MM-DD-transform-plan.md` | Whole-app reshape execution checklist derived from the brief |

One brief file and one plan file per adoption pass. Do **not** merge them.
Optional extra dated notes are fine for session scratch; they are not part of
the brief contract.

## Lifecycle (platform vs in-repo)

**Handoff rule (same as `docs/template-init.md`):** the platform project
document is authoritative **until the first seed** into the repo. After
`YYYY-MM-DD-product-brief.md` is written, that file is the **working copy**
for reshape unless someone intentionally re-syncs from the platform document.
Do not silently maintain two truths.

1. **Platform intake (pre-repo)** — write the authoritative **platform project
   document** at confirm (ALW-591); emit the task slate from the mapping; then
   fabricate. Same field shape as the repo brief file.
2. **First reshape run** — seed `YYYY-MM-DD-product-brief.md` from that
   platform document (copy fields; set `meta.source: platform`). Handoff:
   repo becomes working copy. Then write `YYYY-MM-DD-transform-plan.md`
   aligned to the slate.
3. **In-repo-only** — no platform document: write the brief file during the
   interview (`meta.source: in-repo`), derive the slate, write the plan, execute
   eagerly.

## Naming

Use an ISO date prefix (`YYYY-MM-DD-…`) so multiple passes sort cleanly. If the
same calendar day needs a second pass, append a short slug
(`2026-07-12-product-brief-pass-2.md`) rather than overwriting history.

## What does not belong here

- ADRs, architecture maps, or how-to guides (use `docs/decisions/`,
  `docs/architecture.md`, `docs/guides/`).
- Capability-pack or fabrication manifests (see `.sfab/`).
- Long-lived product requirements after reshape is done — promote anything
  still true into the appropriate durable doc, or leave the dated note as
  historical context.
