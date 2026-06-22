# `.sfab/` — platform-facing manifests

Two manifests live here, with **opposite lifecycles**. See
`decisions/0017-capability-pack-registry.md` (Amendment 2026-06-21b) and
`decisions/0010-template-as-foundation.md` for the full model.

## `fabrication.json` — build config (this repo only, never seeded)

```json
{ "drop": ["apps/docs", "packages/registry"] }
```

Hand-authored input to the fabricate scaffolder (ALW-194). When a new project is
fabricated from this template, the scaffolder reads `fabrication.json`, **deletes
each `drop` path**, and does **not** copy this file into the new repo.

- `drop` — whole pnpm workspace leaves (`apps/*` / `packages/*`) to remove at
  fabrication. Whole-leaf only (no globs, no nested paths): dropping a leaf that a
  kept package still imports makes `pnpm install` hard-fail — the intended guard.
- Anything not listed survives (e.g. root `docs/` is kept simply by not being dropped).

## `template.json` — provenance (born at fabrication, NOT committed here)

This template does **not** track itself, so there is no live `template.json` in this
repo — only `template.example.json` showing its shape. A real one is written into
each **fabricated project** at scaffold time:

```json
{ "ref": "<40-char SHA>", "version": "<editorial label>", "packs": { } }
```

- `ref` — exact template commit SHA the project was scaffolded from; governs all
  asset pulls and drift (ADR-0010 invariant). Mirrored by the platform (ALW-110).
- `version` — editorial release label at scaffold; drift math uses `ref`, not this.
- `packs` — capability-pack provenance; each pack install appends
  `{ "<pack>": { "ref": "<SHA at install>", "installedAt": "<ISO-8601>" } }`.
  UI-only blocks add no entry.
