# ADR-005: Documentation & Knowledge-Layer Convention

**Status:** Accepted
**Date:** 2026-06-18
**Authors:** Team

## Context

This template is read by **both human developers and AI coding agents**, so its
documentation *is* part of the product. Two failure modes pull in opposite
directions: writing an ADR for every choice ("ADR fatigue" — records nobody
trusts), or letting prose sprawl with no convention so neither a human nor an
agent can find the authoritative answer. We need one settled convention for where
knowledge lives and what earns a record.

This decision is itself cross-cutting, costly to reverse (it shapes every doc and
the agent entry point), and was chosen among real alternatives — so it qualifies
under its own significance bar. It is the starter-side counterpart of the
platform's knowledge-layer decision (ADR-0010 §H); the two are kept reconciled.

## Decision

> Adopt a five-bucket knowledge layer with a **strict ADR significance bar**, a
> single canonical agent entry point, and in-repo docs as the source of truth.

### E1 — Decision records, under a strict bar

Keep ADRs, but **reject "ADRs for everything."** An ADR is warranted **only** when
a choice is **(a) costly/disruptive to reverse, (b) cross-cutting** (not local to
one file), **and (c) chose among real alternatives**. Library/syntax/vendor picks
and anything a typecheck or test already catches do **not** get an ADR. Records
capture the template's **opinions and their reversals** (supersede model) — see
`docs/decisions/template.md`.

### E2 — Five buckets, no `plans/`

```
README.md          → adopter launchpad (human, first 10 minutes)
AGENTS.md          → Tier-1 router (agent + human): commands + conventions + index. Thin.
docs/architecture.md  → the one explanatory map (layers + worked example)
docs/decisions/    → ADRs under the E1 bar
docs/guides/       → code-anchored how-to / "how X works" with Files-of-Interest
.agents/skills/    → Tier-2 procedural domain knowledge, loaded on demand
reference          → NOT a folder; generated from code (types/schemas)
```

Division of labor: `decisions/` = *why we chose X over alternatives*;
`architecture.md` = *what the system is*; `guides/` = *how to do/extend X here*;
`skills/` = *procedural domain knowledge, model-triggered by description*;
`AGENTS.md` = *commands + conventions + where everything lives* (no deep content).

**No `docs/plans/`.** Transient implementation plans live in the task system or in
session plan-mode — never committed under `docs/`, which is for durable knowledge.

### E3 — Agent tiering + no duplication

- **Tier-1 is one source, mirrored to two files.** `AGENTS.md` is the canonical
  source (cross-tool standard); `.claude/CLAUDE.md` is a **byte-identical copy**,
  kept in sync by hand — deliberately *not* a symlink, because some tools don't
  follow or auto-read a symlinked instructions file. Edit one, copy it over the
  other. Tool-specific divergence later (e.g. `.cursor/rules`) is its own real file.
- **No human/agent split.** A fact lives once. Humans read `docs/` directly;
  agents reach the same files via the `AGENTS.md` index + skill references.
- **Skills = on-demand Tier-2**, two flavors, one mechanism: vendored (hash-pinned,
  symlinked) and authored-in-repo. Discovery rides on the `description` frontmatter.
- **Guide vs skill:** `docs/guides/` = conventions specific to *this* repo's
  structure (read when the index points there); `.agents/skills/` = procedural,
  reusable-across-tasks knowledge the model triggers autonomously.
- **Reference is generated (Tier-3)** — consumed through the typesystem, never
  re-stated in prose.

### E4 — In-repo docs are the source of truth

The starter's engineering knowledge stays **in-repo under `docs/`, PR-authored**.
Do **not** route it through a platform docs store / MCP. Both consumers — the
adopting developer and a dispatched agent — have the repo cloned, so they read
`docs/` from the working tree, and a forked template owns its docs as plain,
editable markdown.

## Options Considered

### Strict-bar ADRs + five buckets (chosen)

- **For:** records stay trustworthy because every one clears a real bar; the
  buckets map cleanly to the human/agent questions; one canonical agent entry
  avoids drift.
- **Against:** contributors must judge whether a change clears the bar (the
  template provides the test, see `template.md`).

### ADR-for-everything (rejected)

- **Against:** fatigue; the signal-to-noise of the record set collapses; serious
  product repos that do this end up with records nobody reads.

### Diátaxis four mandated folders (rejected)

- **Against:** Diátaxis is a *lens, not a folder mandate*; four mandatory buckets
  are overhead a one-app template hasn't earned.

### Separate human vs agent doc copies (rejected)

- **Against:** guarantees drift; doubles maintenance; the source of truth must be
  singular.

## Consequences

- A small, high-trust `decisions/` set; navigable buckets; a single agent entry
  point that can't drift from its Claude alias.
- Contributors learn one test ("does this clear the bar?") before adding an ADR.
- Doc content is owned by the repo via PR — the platform never overwrites it.

## Related Decisions

- [ADR-001](./001-monorepo-and-architecture.md) — the architecture these docs describe.
- Platform **ADR-0010 §H** (knowledge layer) — reconciled counterpart.

## References

- [`docs/architecture.md`](../architecture.md) · [`docs/decisions/template.md`](./template.md)
