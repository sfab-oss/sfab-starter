# ADR-007: Cloudflare D1 + Drizzle table-recreate migrations and FK cascades

**Status:** Accepted
**Date:** 2026-07-02
**Authors:** Team
**Supersedes / Superseded by:** —

## Context

`drizzle-kit generate` cannot `ALTER` most things in place on SQLite, so for a
column type/default change — or any reshape that touches a column with inbound
foreign keys — it emits its standard **table-recreate** pattern:

```sql
PRAGMA foreign_keys=OFF;
CREATE TABLE __new_<table> (...);
INSERT INTO __new_<table> SELECT ... FROM <table>;
DROP TABLE <table>;
ALTER TABLE __new_<table> RENAME TO <table>;
PRAGMA foreign_keys=ON;
```

The intent of `PRAGMA foreign_keys=OFF` is to protect the `DROP TABLE` from
firing inbound foreign-key cascades. **On Cloudflare D1 that pragma is a no-op**,
verified against the primary sources:

- **`PRAGMA foreign_keys` is a no-op inside a transaction** — official SQLite
  docs: *"This pragma is a no-op within a transaction."* (<https://sqlite.org/pragma.html>)
- **D1 wraps every write — including each migration — in an implicit
  transaction** — Cloudflare docs: *"D1 runs every query inside an implicit
  transaction, [so] user queries cannot change this during a query or
  migration."* (<https://developers.cloudflare.com/d1/sql-api/foreign-keys/>)

So foreign keys stay **on** during the `DROP`, and any inbound
`ON DELETE SET NULL` / `CASCADE` fires. Re-inserting the row with the same id
after the `ALTER … RENAME` does **not** re-link the null'd/cascaded inbound FKs —
the data loss is silent and irreversible. The same migration happens to be safe
on a local `better-sqlite3` file (it is not wrapped the same way), so this class
of bug passes local dev and CI-by-eye and only bites in production.

This is **not a defect in the schema**. `ON DELETE SET NULL` / `CASCADE` are
intentional, correct design. It is a known, still-open upstream interaction:

- Drizzle [#4089](https://github.com/drizzle-team/drizzle-orm/issues/4089)
  (labeled *priority*, the D1-specific report — explicitly says *"the right way
  is `PRAGMA defer_foreign_keys = true`"*),
  [#4938](https://github.com/drizzle-team/drizzle-orm/issues/4938),
  [#5782](https://github.com/drizzle-team/drizzle-orm/issues/5782) — all open;
  community fix [PR #5784](https://github.com/drizzle-team/drizzle-orm/pull/5784)
  unmerged.
- The same SQLite-in-a-transaction root cause hit
  [sqlx #2085](https://github.com/launchbadge/sqlx/issues/2085) — confirming it
  is general SQLite behaviour, not a D1 bug.

Because this template ships the same Drizzle + D1 stack that hit this in
production elsewhere, every project fabricated from it should inherit the
safeguard from day one rather than discover the failure class on its own data.

## Decision

> We keep our FK cascades and keep using `drizzle-kit generate`; the fix lives in
> **how we finish and review a generated migration**, per Cloudflare's documented
> mechanism, backed by a CI guard.

### 1. Use `defer_foreign_keys`, never rely on `foreign_keys=OFF`

When `drizzle-kit generate` emits a table-recreate (an `__new_<table>` create +
`DROP TABLE <table>`) for a table that has **inbound `ON DELETE SET NULL` /
`CASCADE` foreign keys**, the author **hand-edits the generated migration**:
replace the leading `PRAGMA foreign_keys=OFF;` with
`PRAGMA defer_foreign_keys=true;` and delete the trailing
`PRAGMA foreign_keys=ON;`.

Cloudflare prescribes exactly this: *"When applying a migration, you may need to
temporarily disable foreign key constraints. To do so, call
`PRAGMA defer_foreign_keys = true` before making changes that would violate
foreign keys."* (<https://developers.cloudflare.com/d1/reference/migrations/>).
Unlike `foreign_keys`, `defer_foreign_keys` is valid **inside** a transaction
and auto-resets at the next `COMMIT` (<https://sqlite.org/pragma.html>).

This is *sanctioned* hand-editing. Editing only the pragma lines does not
desync Drizzle's snapshot, because `drizzle-kit generate` diffs the current
schema against `snapshot.json` (schema **state**), not against the prior `.sql`
text. Authoring/editing migration SQL is the normal workflow on both sides:
Cloudflare's `wrangler d1 migrations create` produces an empty file you write
yourself, and Drizzle ships `drizzle-kit generate --custom` for hand-written SQL.

### 2. No automated rewrite of generated SQL

We do **not** add a post-`generate` script that mutates Drizzle's output.
Neither Drizzle nor Cloudflare endorses that; it has no vendor precedent and is
brittle against Drizzle output changes. The remediation is the manual edit
above, backed by the CI guard below.

### 3. Prefer not triggering a destructive recreate at all

A column **default** change only affects future `INSERT`s that omit the column;
if our code always supplies the value, the recreate buys nothing. Such cosmetic
changes should not ship as a destructive table-recreate. Prefer leaving the
schema default alone (or expressing the change as a no-op / `--custom`
migration) rather than letting a recreate run for no functional gain.

### 4. CI guard (a check, not a rewrite)

`apps/web/test/migration-safety.test.ts` fails when a migration ships the unsafe
table-recreate pattern (a literal `PRAGMA foreign_keys=OFF`) instead of
`defer_foreign_keys`, pointing the author at this ADR with the exact edit. It
runs as part of `pnpm test` in CI. The starter's existing migrations contain no
`PRAGMA foreign_keys=OFF`, so the guard's allowlist starts **empty**.

### 5. Never rewrite an already-applied migration

A migration recorded in D1's `_d1_migrations` is immutable. Fixes are
forward-only — add a corrective migration, never edit the applied one.

## Options Considered

### Hand-edit the pragma + CI guard (chosen)

- **For:** exactly what Cloudflare documents; no bespoke tooling; the guard
  makes the next unsafe recreate fail CI before merge.
- **Against:** generated migrations for default/type changes require a manual
  edit step before merge — a sharp edge contributors must know about. The guard
  mitigates it by failing loudly with the fix in the message.

### Automated post-`generate` rewrite of the pragma (rejected)

- **Against:** no vendor precedent; brittle against Drizzle output changes;
  silently mutates generated output, which is harder to reason about than a
  reviewed manual edit.

### Drop the inbound `ON DELETE` cascades (rejected)

- **Against:** the cascades are intentional, correct design (deleting a parent
  should unlink/delete dependents as declared). Removing them to dodge a
  tooling bug would corrupt the schema's semantics.

## Consequences

### Positive

- The silent-data-loss class cannot recur unnoticed: the next unsafe recreate
  fails CI before merge, with the exact `foreign_keys=OFF` →
  `defer_foreign_keys=true` edit in the failure message.
- The remediation is exactly what Cloudflare documents — no bespoke tooling to
  maintain.
- Documents that the FK cascades are correct, so future contributors don't
  "fix" them by removing intentional cascades.

### Negative

- Generated table-recreate migrations require a manual edit step before merge.
- The guard is pattern-based; a sufficiently novel destructive migration shape
  could slip past it.

## Implementation Notes

| Area | Location |
|---|---|
| CI guard test | `apps/web/test/migration-safety.test.ts` (runs in `pnpm test`) |
| Migration source | `packages/db/drizzle/*.sql` (loaded into `TEST_MIGRATIONS` by `vitest.config.ts`) |
| Grandfather allowlist | none (the starter ships clean) |
| Manual procedure | After `pnpm db:generate`, in any migration with `__new_*` + `DROP TABLE`: `PRAGMA foreign_keys=OFF;` → `PRAGMA defer_foreign_keys=true;`, drop the trailing `PRAGMA foreign_keys=ON;` |

## Related Decisions

- [ADR-002](./002-d1-migrations.md) — the migration workflow this guard
  protects; its operational-caution note now links here.

## References

- SQLite: <https://sqlite.org/pragma.html>
- Cloudflare D1 migrations: <https://developers.cloudflare.com/d1/reference/migrations/>
- Cloudflare D1 foreign keys: <https://developers.cloudflare.com/d1/sql-api/foreign-keys/>
- Drizzle issues: [#4089](https://github.com/drizzle-team/drizzle-orm/issues/4089),
  [#4938](https://github.com/drizzle-team/drizzle-orm/issues/4938),
  [#5782](https://github.com/drizzle-team/drizzle-orm/issues/5782);
  sqlx [#2085](https://github.com/launchbadge/sqlx/issues/2085)
