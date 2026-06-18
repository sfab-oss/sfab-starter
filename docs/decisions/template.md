# ADR Template & Guidelines

Architecture Decision Records capture this template's **opinions and their
reversals** — not every choice. Before writing one, apply the bar.

## The significance bar (write an ADR only if all three hold)

An ADR is warranted **only** when the choice is:

1. **Costly or disruptive to reverse** — it shapes structure, the dependency
   graph, or a cross-surface contract, not one file.
2. **Cross-cutting** — it affects many capabilities/layers, not a local detail.
3. **Chosen among real alternatives** — there was a genuine fork worth recording.

If it fails any of these, it is **not** an ADR. In particular:

- Library / syntax / vendor picks → a `docs/guides/` note or just the code.
- Anything a typecheck or test already enforces → no record needed.
- A reversal of a previous ADR → **does** qualify (record it; supersede the old one).

See [ADR-005](./005-documentation-and-knowledge-layer.md) for the convention this
bar belongs to.

## Lifecycle

- ADRs are **append-mostly**: prefer a new ADR that supersedes an old one over
  editing an accepted record's decision.
- **Exception — one-time re-enumeration:** a template reset may *remove* a
  superseded / no-value ADR and renumber the survivors into a clean contiguous
  sequence (as was done on 2026-06-18). Outside that reset, don't renumber.
- When an ADR is superseded, set its **Status** and fill the **Supersedes /
  Superseded by** field so the reversal is traceable.

---

# ADR-NNN: [Title]

**Status:** [Proposed | Accepted | Superseded by ADR-NNN]
**Date:** YYYY-MM-DD
**Authors:** [Names]
**Supersedes / Superseded by:** [ADR-NNN, or —]

## Context

The situation forcing a decision: the problem, the constraints, and — if this
reverses an earlier record — what changed our mind.

## Decision

State it in one sentence.

> We will [do X] because [primary reason].

Then the specific rules/principles it establishes.

## Options Considered

### [Option name] (chosen / rejected)

- **For:** the case for it.
- **Against:** the cost.

(Repeat for each real alternative. Keep it to the forks that actually mattered —
no filler pros/cons.)

## Consequences

What becomes true once this lands — the good, the trade-off accepted, and any
ongoing discipline it requires.

## Related Decisions

- [ADR-NNN](./NNN-title.md) — how it relates.

## References

- [Relevant docs / discussion]
