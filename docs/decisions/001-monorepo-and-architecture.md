# ADR-001: Monorepo & Layer-Sliced Architecture

**Status:** Accepted
**Date:** 2026-06-18
**Authors:** Team

## Context

This is a template for full-stack TypeScript apps on Cloudflare Workers, consumed
by **both human developers and AI coding agents**. It needs a structure that:

- Shares code across surfaces (UI, HTTP API, MCP, AI tools) without a framework
  owning the layout.
- Is **legible** — a reader can predict where a thing lives without searching.
- Scales by repetition: adding a feature should mean repeating a known shape, not
  inventing a new one.
- Lets a registry **pack** be authored as a vertical and installed as slices.

The project is committed to Cloudflare Workers as its only runtime, and runs as a
**single Worker app** hosting many surfaces.

## Decision

> We use a **pnpm + Turbo monorepo** with a **layer-sliced, feature-keyed**
> architecture: a fixed small set of layers, where a capability is the same key
> (`<cap>`) present in each layer. One Worker app (`apps/web`) hosts all surfaces.
> Packages are named for their **role, not their technology**.

The layers and the full map are documented in
[`docs/architecture.md`](../architecture.md). In short:

- **Layers:** `db` → `contract` → `core` → surfaces (`apps/web`) / `agent` →
  `ui` → in-app `components`. Dependencies point one way, down this list.
- **Feature-key consistency (D1/D7):** a capability `<cap>` appears as
  `db/schema/<cap>.ts`, `contract/<cap>/`, `core/<cap>/`,
  `apps/web/src/hono/<auth-scope>/<cap>/`, `agent/tools/<cap>.ts`, and
  `apps/web/src/components/<cap>/`. Find one, you know the rest.
- **One Worker app (D6):** `apps/web` hosts UI + Hono API + MCP + AI Durable
  Objects + jobs. A new app only when the runtime genuinely differs.
- **Naming = role over technology (D6):** `web-tanstack`→`web`, `db-d1`→`db`,
  `types`→`contract`, `cloudflare-env`→`env`, `typescript-config`→`tsconfig`;
  scope stays `@workspace/*`.

## Options Considered

### Layer-sliced, feature-keyed (chosen)

A capability is a slice repeated across a fixed layer set.

- **For:** one predictable shape; adding a feature is mechanical; packs map
  cleanly onto layer targets; surfaces share a framework-agnostic `core`.
- **Against:** a single feature is spread across several directories (mitigated by
  the identical `<cap>` key making the spread navigable).

### Package-per-domain (rejected — midday-style)

Each domain gets its own package.

- **Against:** package proliferation for a template with one app; heavy
  `package.json`/tsconfig overhead per feature; obscures the shared layer shape.

### Fat single `core` bucket (rejected — sfab-today-style)

All services in one flat `core` package.

- **Against:** no cross-layer key; `core/*.ts` grows unstructured; can't slice a
  capability in or out cleanly; packs have no clean target.

## Consequences

### Positive

- The layout is guessable; agents and humans navigate by the `<cap>` key.
- Boundaries are mechanical (ADR enforced by the dep graph) — see
  [`docs/architecture.md`](../architecture.md#mechanical-boundaries).
- Surfaces multiply cheaply because they all sit over one `core`.

### Negative

- Up-front discipline: a feature must be sliced across layers even when small.
- Role-over-tech renames mean the package name and its implementing library can
  differ (the point — but it must be learned once).

### Neutral

- pnpm + Turbo (not Nx/yarn) — a tooling preference; Turbo caches builds, pnpm is
  disk-efficient.

## Related Decisions

- [ADR-002](./002-d1-migrations.md) — D1 migrations.
- [ADR-003](./003-cloudflare-env-and-db-singleton.md) — env + db singleton.
- [ADR-004](./004-schema-sources-and-boundary-types.md) — two schema sources.
- [ADR-005](./005-documentation-and-knowledge-layer.md) — docs convention.

## References

- [`docs/architecture.md`](../architecture.md) — the full layer map + worked example.
- [Turbo](https://turbo.build/repo/docs) · [pnpm Workspaces](https://pnpm.io/workspaces)
