# Comment hygiene

## The smell / the question

A comment earns its place only when it explains something **not inherent** in
the code — business process, external constraints, races, platform quirks, or
a non-obvious *why*. If a competent reader can infer the same fact from names,
types, or the next line in a few seconds, the comment is noise.

Common smells in this repo:

| Remove | Keep |
|--------|------|
| Section / JSX banners (`// --- Helpers ---`, `{/* Logo Area */}`) | Why / invariants / races / platform quirks |
| Name-echo JSDoc / inline narration | ADR / ALW / § / issue links |
| Lettered substeps that only label the next insert | Money / RBAC / security |
| Numbered pipeline labels (`// 1. READ`) when order is obvious | `biome-ignore` / `@ts-expect-error` **with** reason |
| Duplicate boilerplate (dedupe to one copy with real why) | Empty-catch markers Biome needs |
| Commented-out code; AI hedge (`Note:`, `Important:`) | Schema comments encoding real constraints (UNIQUE/NULL quirks) |

**Prefer refactor over a clarifying comment** when the code is unclear — rename
or extract so the name carries the meaning. That is a separate task; a hygiene
pass only **removes** dumb comments, it does not rename or restructure.

**Do not** strip open `TODO`/`FIXME` that reference real work, or edit
`.sfab/*`.

## The preferred pattern

Write self-descriptive code. When something truly needs explanation, say *why*
once — at module scope, on a non-obvious block, or with a link to an ADR —
not on every sibling file.

```ts
// Bad — narrates the next line
// Check if already reversed.
const [existing] = await db.select(...).where(eq(payments.reversesPaymentId, paymentId));

// Good — the query + error message are self-describing; no comment needed
const [existing] = await db.select(...).where(eq(payments.reversesPaymentId, paymentId));
if (existing) {
  throw new DomainError("Payment already reversed", "conflict");
}

// Good — documents a race the types cannot express
// 5. EXECUTE — one atomic batch. If a concurrent first-time request with
//    the same idempotency key raced past the pre-check, the
//    payments_org_idem_uniq UNIQUE constraint fires here; the catch handler
//    re-reads and returns the existing payment instead of a raw 500 (F2).
```

```tsx
// Bad
{/* Logo Area */}
<LogoMark />

// Good — no banner; the component name is enough
<LogoMark />
```

Linter directives stay, but **always with a reason** on the same line:

```ts
// biome-ignore lint/style/useErrorCause: DomainError accepts ErrorOptions.cause
```

## Files of Interest

- `AGENTS.md` — short Code standards bullets + link here
- `packages/core/src/transaction/payments.ts` — batch assembler; keep race/idempotency comments, drop step banners
- `packages/core/src/transaction/finalize.ts` — folio race + credit-limit ordering comments are keepers
- `packages/agent/src/tools/guard.ts` — RBAC / mutation boundary (always keep)
- `packages/agent/src/tools/transaction/payments.ts` — row-cap rationale (one copy for context safety)
- `apps/web/src/components/chat/window/chat-window.tsx` — ticket-linked framework rationale (keep)
- Prior art: sfab ALW-338 / PR #362; starter ALW-334 / PRs #10–#11
