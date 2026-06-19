/**
 * Skeleton — TransactionCore (Tier-1 base primitive, ADR-0010 §E).
 *
 * The hub: Documents + LineItems (quote = order = invoice = PO), decimal-safe money, a generic tax field, document numbering/folios, status, emits domain events. Designed in ALW-328.
 *
 * Not yet implemented. When built it follows the layer-sliced, feature-keyed
 * shape (same `transactions` key in every layer): `packages/db/src/schema/transactions.ts`,
 * `packages/contract/src/transactions/`, `packages/core/src/transactions/`,
 * `apps/web/src/hono/<auth-scope>/transactions/`, `packages/agent/src/tools/transactions/`,
 * `apps/web/src/components/transactions/`. See `docs/architecture.md`.
 */
export type TransactionCoreSkeleton = never;
