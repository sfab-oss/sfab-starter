import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createdAt, id } from "../utils";

/**
 * The unified activity / event / audit log (transaction-core.md §7–§8).
 *
 * The hub's domain events land here as `kind: "event"` rows — written inside
 * the finalize `db.batch()` — and the same rows feed both the BI/event log and
 * the human-readable activity timeline. Human notes and audit edits share the
 * table, giving one timeline per document/entity.
 *
 * `eventType` (e.g. `document_finalized`) discriminates events; `entityType`
 * + `entityId` link the row to its subject.
 */

export const ACTIVITY_KINDS = ["audit", "event", "note"] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export const activityLog = sqliteTable(
  "activity_log",
  {
    id: id(),
    organizationId: text("organization_id").notNull(),

    kind: text("kind", { enum: ACTIVITY_KINDS }).notNull(),
    eventType: text("event_type"), // e.g. "document_finalized"
    entityType: text("entity_type"), // e.g. "document", "entity"
    entityId: text("entity_id"),

    actorId: text("actor_id"), // the user who performed/triggered it
    summary: text("summary"), // human-readable, surfaced on the timeline
    metadata: text("metadata", { mode: "json" }).$type<
      Record<string, unknown>
    >(),

    createdAt,
  },
  (table) => [
    index("activity_org_entity_idx").on(
      table.organizationId,
      table.entityType,
      table.entityId
    ),
    index("activity_org_event_idx").on(table.organizationId, table.eventType),
  ]
);

export type ActivityLog = typeof activityLog.$inferSelect;
export type NewActivityLog = typeof activityLog.$inferInsert;
