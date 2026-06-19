// Skeleton — ActivityLog tables (Tier-1 base primitive, ADR-0010 §E).
// One append-only table with a kind discriminator (audit | event | note).
// Not yet implemented and deliberately NOT exported from schema/index.ts until
// it is. See packages/core/src/activity/ and docs/architecture.md.
export type ActivityLogTablesSkeleton = never;
