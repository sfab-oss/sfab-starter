/**
 * Skeleton — ActivityLog (Tier-1 base primitive, ADR-0010 §E).
 *
 * The unified append-only log — one table, kind: audit (automatic data-layer middleware) | event (deliberate domain emits, the BI substrate) | note (human timeline). See ADR-0010 amendment §F.
 *
 * Not yet implemented. When built it follows the layer-sliced, feature-keyed
 * shape (same `activity` key in every layer): `packages/db/src/schema/activity.ts`,
 * `packages/contract/src/activity/`, `packages/core/src/activity/`,
 * `apps/web/src/hono/<auth-scope>/activity/`, `packages/agent/src/tools/activity/`,
 * `apps/web/src/components/activity/`. See `docs/architecture.md`.
 */
export type ActivityLogSkeleton = never;
