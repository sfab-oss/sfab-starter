# ADR-004: Two Schema Sources & Direction-Split Boundary Types

**Status:** Accepted
**Date:** 2026-06-18
**Authors:** Team

## Context

A typed full-stack app has to answer two different questions about the same
capability: *what shape is stored* (rows) and *what shape is accepted* (commands).
A natural-looking move is to make one the source of the other — e.g. derive Zod
input schemas from Drizzle tables with `drizzle-zod`, giving a single source of
truth.

An **earlier proposal recorded for this template chose exactly that** (adopt
`drizzle-zod` + a `types` package re-exporting DB-derived schemas, with an
optional `primitives` package). That record was **removed in the 2026-06-18
re-enumeration** because we reversed the decision; this ADR is its replacement
and explains why. (This is the "records its reversal" case the ADR significance
bar in [ADR-005](./005-documentation-and-knowledge-layer.md) is meant to capture.)

The reversal matters because it is cross-cutting (touches every capability's type
flow), costly to undo later (it shapes the package graph), and we chose among
real alternatives.

## Decision

> Keep **two independent schema/type sources** and do **not** derive one from the
> other. `db` (Drizzle) owns row types via `$infer`; `contract` (pure boundary
> Zod) owns input types via `z.infer`. Drift is caught by **per-capability
> round-trip tests**, not a compile-time derivation chain. Types split by
> **direction**: inbound is *defined* once in `contract`; outbound is *inferred*
> once from `core`.

This retires the `types` and `primitives` packages — `contract` (boundary zod) +
`db` `$infer` (rows) replace them.

### The rules (D2/D3)

- **db (drizzle)** → row/persistence types via `$infer`. Leaf, no workspace deps.
- **contract (zod)** → boundary input/command types via `z.infer`. Leaf, no
  workspace deps, feature-keyed (`contract/<cap>/`). Hand-written, not derived.
- **Inbound** (inputs/commands): explicit Zod in `contract`, shared as runtime
  **values** by API / MCP / AI tools / client forms; `core` fn params are
  `z.infer<contract>` (no hand-sync).
- **Outbound** (reads): **inferred** from the implementation — clients via the
  typed Hono client `InferResponseType`; server via `Awaited<ReturnType>` of the
  `core` function.
- **Timestamps = ISO `text` end-to-end** for domain tables (Better-Auth `Date`
  columns are an accepted internal-only one-off). **Money = numeric → `number`
  customType.**
- Types are identified by **import location + suffix** — no `Db*` prefix.

## Options Considered

### Two independent sources, no derivation (chosen)

- **For:** rows and commands are genuinely different (a create command is not a
  row), so forcing one to derive the other leaks persistence concerns into the
  boundary and vice versa; `contract` stays a pure leaf usable by the client and
  AI tools without pulling in Drizzle; packs author a `contract/<cap>/` slice with
  no DB coupling; the boundary is explicit and readable.
- **Against:** two definitions *can* drift — mitigated by required per-capability
  round-trip tests rather than the compiler.

### Derive zod from drizzle (`drizzle-zod`) — the reversed proposal (rejected)

- **For:** one source of truth; add a column, validation updates.
- **Against:** couples the boundary schema to table shape (every input schema
  drags persistence structure); `contract` would depend on `db`, so the client /
  `ui` / AI-tool layers pull Drizzle into their graph; derived-then-`.omit()/.extend()`
  schemas are *less* legible than a hand-written boundary; fights the layer-sliced
  pack model where a slice's `contract` should stand alone.

### Full multi-package split (db + core + schemas + primitives) (rejected)

- **Against:** four packages of ceremony for a template with one app; `schemas` is
  mostly pass-through re-exports at this scale; `primitives` is premature.

## Consequences

### Positive

- `contract` and `db` are independent leaves; clean one-way dep graph
  (`db`/`contract` → `core` → surfaces).
- Each type answers "where is this defined?" by its import location.
- Packs slice cleanly: a capability's `contract/` carries no DB dependency.

### Negative

- The two sources must be kept honest by **round-trip tests** per capability
  (the compiler won't do it for you).
- One more discipline to learn: inputs are written, outputs are inferred — don't
  hand-write a response type.

### Neutral

- `core` function signatures become the canonical outbound type; renaming a `core`
  return ripples through inferred consumers by design.

## Related Decisions

- [ADR-001](./001-monorepo-and-architecture.md) — the layer model these sources sit in.
- [ADR-003](./003-cloudflare-env-and-db-singleton.md) — the `db` singleton the rows come from.

## References

- [`docs/architecture.md`](../architecture.md#two-schema-sources-by-direction)
- [Drizzle `$inferSelect` / `$inferInsert`](https://orm.drizzle.team/docs/goodies#type-api)
- [Hono RPC `InferResponseType`](https://hono.dev/docs/guides/rpc)
