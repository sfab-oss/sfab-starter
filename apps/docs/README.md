# docs (renderer)

A thin static renderer over the repo's canonical [`docs/`](../../docs)
directory. It reads that markdown at build time and **duplicates no content** —
`docs/` is the single source of truth.

```bash
pnpm --filter docs build   # renders docs/ -> apps/docs/dist/
```

**Droppable at fabrication.** When a project is fabricated from this template,
the `apps/docs` *app* is removed while `docs/` is **kept** (it travels with the
fork as editable markdown). See `.sfab/template.json` → `fabrication.drop`.
