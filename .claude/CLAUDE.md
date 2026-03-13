# Code Standards

This project uses **Biome** for code formatting and linting.

## Quick Reference

- **Fix issues**: `pnpm lint:fix`
- **Type check**: `pnpm typecheck`

Run these commands from the monorepo root rather than in individual packages.

---

## Documentation

`docs/decisions/` contains ADRs (Architecture Decision Records) — the "why" behind significant choices. When making significant or architectural changes, create an ADR there (use `template.md`).

`docs/plans/` is for implementation plans that need to survive across multiple sessions. Prefer plan-mode for plans that fit in a single session. When a plan is implemented, delete its file — if the decision is worth preserving, create an ADR instead.

---

## Skills

Use relevant slash command skills (e.g. `/cloudflare`, `/ai-sdk`) when working on tasks that match their domain.
