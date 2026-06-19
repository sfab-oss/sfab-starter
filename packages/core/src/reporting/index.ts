/**
 * Skeleton — Reporting (Tier-1 base primitive, ADR-0010 §E).
 *
 * Thin read/aggregate layer over the activity log's kind:event rows.
 *
 * Not yet implemented. When built it follows the layer-sliced, feature-keyed
 * shape (same `reporting` key in every layer): `packages/db/src/schema/reporting.ts`,
 * `packages/contract/src/reporting/`, `packages/core/src/reporting/`,
 * `apps/web/src/hono/<auth-scope>/reporting/`, `packages/agent/src/tools/reporting/`,
 * `apps/web/src/components/reporting/`. See `docs/architecture.md`.
 */
export type ReportingSkeleton = never;
