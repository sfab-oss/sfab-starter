# MCP pack — install skill (ephemeral)

One-shot procedure. Run it after `shadcn add sfab-oss/sfab-starter/mcp#<ref>`,
then delete this file.

This skeleton does not yet carry layer slices. Do not install it into a
real project until those files exist.

## Steps

1. Confirm the copied files landed on their `registry.json` `target` paths.
2. Wire non-file-drop seams the base does not auto-register: db barrel, auth
   plugins, Hono / `server.ts` intercept, Settings nav, i18n messages.
3. Copy durable use docs into the project (`docs/guides/mcp.md` and one
   `AGENTS.md` index line). Cursor as a client is told by Settings, not by
   this skill.
4. Record provenance on `.sfab/template.json`: `packs.mcp = { ref, installedAt }`.
   `ref` is the template SHA at install. Never write a `mode` / forked / tracked
   field. In this repo the helper is `packages/registry/src/pack-provenance.ts`
   (`writePackProvenance`). Fabricated projects drop `packages/registry`, so
   the live install skill must write the same shape itself (or copy the helper
   into a kept path first).
5. Delete this `skill.md`.
