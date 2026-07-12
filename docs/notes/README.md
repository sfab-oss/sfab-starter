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

1. **Platform intake (pre-repo)** — the authoritative brief is a **platform
   project document** written at confirm (ALW-591). It uses the same field
   shape as the repo brief file.
2. **First reshape run** — seed `YYYY-MM-DD-product-brief.md` from that
   platform document (copy fields; set `meta.source: platform`). Then write
   `YYYY-MM-DD-transform-plan.md` and the initial task slate from the brief.
3. **In-repo-only** — no platform document: write the brief file during the
   interview (`meta.source: in-repo`), then the plan, then execute eagerly.

After seed, treat the repo brief as the working copy for the reshape agent.
If the platform document and the mirror diverge, reconcile deliberately — do
not silently maintain two truths.

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
