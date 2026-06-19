/**
 * Skeleton — FileHub (Tier-1 base primitive, ADR-0010 §E).
 *
 * Durable, shared, R2-backed org file store + viewers + a programmatic API + the agent tool-bridge. The current R2 helper lives in core/uploads.ts; File Hub generalizes it. See ADR-0010 amendment §G.
 *
 * Not yet implemented. When built it follows the layer-sliced, feature-keyed
 * shape (same `files` key in every layer): `packages/db/src/schema/files.ts`,
 * `packages/contract/src/files/`, `packages/core/src/files/`,
 * `apps/web/src/hono/<auth-scope>/files/`, `packages/agent/src/tools/files/`,
 * `apps/web/src/components/files/`. See `docs/architecture.md`.
 */
export type FileHubSkeleton = never;
