/**
 * The domain-event spine (transaction-core.md §7).
 *
 * The hub emits domain events; it does not contain pack logic. `finalize`
 * writes a `kind: "event"` row into `activity_log` **inside the db.batch()** —
 * that single row is both the BI/event log and the activity-timeline source.
 * The two-tier dispatch ships here:
 *
 * - **critical** tier — runs *in* the same transaction; the base owns none and
 *   registers none (the stock decrement is ALW-350's, appended into the batch).
 * - **afterCommit** tier — runs after the write commits, non-blocking. This is
 *   the **posting seam** (C7): a GL pack subscribes later. The base ships the
 *   dispatch but no consumer (the in-batch event row already serves the
 *   timeline + log), so `runAfterCommit` is a documented no-op seam.
 */

export interface DomainEvent {
  organizationId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  actorId?: string | null;
  summary?: string;
  metadata?: Record<string, unknown>;
}

/**
 * SEAM: afterCommit fan-out (notifications, fiscal stamp, GL posting hook).
 * Non-blocking; runs only after the batch commits. The base registers no
 * handler (C7 by design) — packs (ALW-350 / contabilidad) add consumers.
 */
export async function runAfterCommit(_events: DomainEvent[]): Promise<void> {
  // intentionally empty in the base — the seam is the call site + contract.
}
