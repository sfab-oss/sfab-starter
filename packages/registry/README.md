# @workspace/registry

The SFAB capability + UI registry — the source of truth for what the starter
distributes through the public shadcn **GitHub registry**
(`shadcn add sfab-oss/sfab-starter/<item>#<ref>`). See
`.sfab/.docs/decisions/0017-capability-pack-registry.md` (and its 2026-06-21
amendment) for the model.

## One primitive, two kinds

Every item is one shadcn `RegistryItem`. A single metadata field —
`meta.sfabKind` — is the install-contract discriminator:

- **`block`** — a copy-in UI item. `shadcn add` drops the files; done.
- **`pack`** — a capability: the same item carrying extra layer slices
  (`db/contract/core/server/tools`) plus an ephemeral `skill.md`. Install also
  runs the skill, writes `.sfab/template.json` provenance, and triggers a Layer-2
  eval. (No packs yet; the first is POS.)

Independently, the shadcn `type` (`registry:ui` vs `registry:block`) decides how
the docs gallery *previews* an item — inline vs iframed.

## Authoring an item

Each item is a directory under `registry/blocks/<name>/` or
`registry/components/<name>/`:

```
registry/blocks/resource-list-page/
  item.ts
  page.tsx
  ...

registry/components/shell/
  item.ts
  shell-demo.tsx
```

`item.ts` default-exports `{ item, preview }` — the shadcn `RegistryItem` (with
file paths written RELATIVE to the item dir) and the file to lazy-load for the
gallery. Then regenerate:

```sh
pnpm --filter @workspace/registry generate   # writes registry.json + src/generated.ts
pnpm --filter @workspace/registry test       # Layer-1: manifest + render
```

## Generated, never hand-edited

- **`/registry.json`** (repo root) — the shadcn manifest; file paths are rewritten
  repo-root-relative (the GitHub-registry requirement).
- **`src/generated.ts`** — the gallery's `name -> { ...meta, lazy component }` map.

`pnpm --filter @workspace/registry generate:check` is the CI drift gate (fails if
either artifact is stale).
