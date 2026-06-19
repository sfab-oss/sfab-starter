/**
 * Skeleton — I18n (Tier-1 base primitive, ADR-0010 §E).
 *
 * Translation capability: EN (default) + ES, locale switch, AI-assisted translation, locale-aware money/date formatting. Spanish content + country specifics ship in packs, not the base.
 *
 * Not yet implemented. When built it follows the layer-sliced, feature-keyed
 * shape (same `i18n` key in every layer): `packages/db/src/schema/i18n.ts`,
 * `packages/contract/src/i18n/`, `packages/core/src/i18n/`,
 * `apps/web/src/hono/<auth-scope>/i18n/`, `packages/agent/src/tools/i18n/`,
 * `apps/web/src/components/i18n/`. See `docs/architecture.md`.
 */
export type I18nSkeleton = never;
