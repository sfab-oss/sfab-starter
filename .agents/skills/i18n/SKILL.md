---
name: i18n
description: >-
  Keep SFAB starter UI catalogs current with Paraglide (EN source of truth +
  target locales). Use when adding a language (e.g. French), adding user-visible
  UI copy, fixing i18n lint gaps, or translating after pnpm i18n:lint.
  Triggers: i18n, locale, Paraglide, translation, messages/en.json, add French,
  Spanish copy, language switcher.
---

# i18n skill (catalog-first)

Read [`docs/guides/i18n.md`](../../../docs/guides/i18n.md) for layout and
commands. This skill is the checklist — **never hardcode user-visible UI
strings** in JSX/TS; edit catalogs instead.

## Hard rules

1. **EN is source of truth** — only humans/agents author `packages/i18n/messages/en.json`
2. **Targets are filled from gaps** — run `pnpm i18n:lint -- --json`; edit `es.json` / `fr.json` / …
3. **No API key required** — do not invent a vendor translate step unless the user asks
4. **Cookie only** — do not add `/es` URL prefixes or DB locale columns unless asked
5. **App-only** — do not localize `packages/registry` here (ALW-571)

## Add a locale (Journey A)

```bash
# 1–2. Register locale in project.inlang settings + packages/i18n/src/locales.ts
# 3. Create packages/i18n/messages/<locale>.json as {}
pnpm i18n:sync
pnpm i18n:lint -- --json   # fill every gap in messages/<locale>.json
pnpm i18n:lint             # must be green
pnpm i18n:compile
```

Use `glossary/<locale>.md` (copy `glossary/es.md` as a template) for tone.

The language switcher is driven by `LOCALES` in `@workspace/i18n/locales` — no
hand-edited React locale list.

## New UI copy (Journey B)

```bash
# 1. Add keys to packages/i18n/messages/en.json
# 2. Use m.key_name() from @/paraglide/messages.js in apps/web
pnpm i18n:sync
pnpm i18n:lint -- --json   # translate only new/empty keys
pnpm i18n:lint
pnpm i18n:compile          # or rely on Vite plugin during dev/build
```

Placeholders like `{name}` / `{role}` must match EN exactly — lint fails otherwise.

## After changing English

If you edit an existing EN string, update targets and run `pnpm i18n:sync` so
`.i18n-lock.json` hashes refresh. Lint warns on `stale_en_hash`.

## Smoke (human / manager)

Edit-only agents cannot start the dev server. Leave notes:

1. Load app (default English chrome)
2. Org menu → language switcher → Español
3. Confirm cookie `PARAGLIDE_LOCALE=es`, reload stays Spanish
4. Spot-check shell nav + invite-member / settings RBAC hints + one money amount
