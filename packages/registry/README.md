# @workspace/registry

The SFAB capability + UI registry — the source of truth for what the starter
distributes through the public shadcn **GitHub registry**
(`pnpm dlx shadcn@4.20.1 add sfab-oss/sfab-starter/<item>#<ref>`). Pack vs block install
semantics are summarized below; scaffold provenance lives under
[`.sfab/README.md`](../../.sfab/README.md).

## One primitive, two kinds

Every item is one shadcn `RegistryItem`. A single metadata field —
`meta.sfabKind` — is the install-contract discriminator:

- **`block`** — a copy-in UI item. `shadcn add` drops the files; done. Gallery
  preview lives in `src/generated.ts`.
- **`pack`** — a capability: layer slices (`db/contract/core/server/tools`) plus
  an ephemeral `skill.md`. Add with `-c apps/web` so pack `target`s resolve
  (repo-root via `~/../../…`). An agent then runs `skill.md` (wire
  barrels/routes/i18n, write `.sfab/template.json` provenance, delete the
  skill). Packs are listed in `registry.json` and are **not** in the docs
  gallery. Layer-2 install-eval over sandboxes is later.

Independently, the shadcn `type` (`registry:ui` vs `registry:block`) decides how
the docs gallery *previews* a UI item — inline vs iframed. Packs use
`registry:block` as the multi-file item type.

The first pack is **MCP** (`registry/packs/mcp/`). POS is later.

## Authoring an item

UI items live under `registry/blocks/<name>/` or `registry/components/<name>/`.
Packs live under `registry/packs/<name>/`. Layer files there are install
payloads (app/package aliases). Only each pack's `item.ts` is part of this
package's typecheck.

```
registry/blocks/resource-list-page/
  item.ts
  page.tsx
  ...

registry/packs/mcp/
  item.ts
  skill.md
  db/ ...
```

`item.ts` default-exports `{ item, preview? }` — the shadcn `RegistryItem`
(file paths RELATIVE to the item dir) and, for UI items, the file to lazy-load
for the gallery. Packs omit `preview`. Then regenerate:

```sh
pnpm --filter @workspace/registry generate   # writes registry.json + src/generated.ts
pnpm --filter @workspace/registry test       # Layer-1: manifest + render + provenance
```

## Install skill + provenance

A pack's `skill.md` is a one-shot install procedure. Last acts: write

```json
"packs": { "<name>": { "ref": "<template SHA>", "installedAt": "<ISO-8601>" } }
```

onto the project's `.sfab/template.json` (no `mode` field), then **delete
`skill.md`**. The helper is `src/pack-provenance.ts` (`writePackProvenance`).
Fabricated projects drop `packages/registry`, so a live install must write that
shape itself (or copy the helper into a kept path first).

## Generated, never hand-edited

- **`/registry.json`** (repo root) — the shadcn manifest; file paths are rewritten
  repo-root-relative (the GitHub-registry requirement). Includes packs.
- **`src/generated.ts`** — the gallery's `name -> { ...meta, lazy component }` map
  (UI items only).

`pnpm --filter @workspace/registry generate:check` is the CI drift gate (fails if
either artifact is stale).
