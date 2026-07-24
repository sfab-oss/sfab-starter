import type { ActivityTimelineEntry } from "@/components/documents/activity-timeline";

/** Subset of `activity_log` rows returned by GET /documents/activity. */
export interface DocumentActivityRow {
  id: string;
  eventType: string | null;
  summary: string | null;
  createdAt: string;
  actorId?: string | null;
}

/** Turn snake_case event types into a short table label. */
export function humanizeEventType(eventType: string | null): string {
  if (!eventType) {
    return "event";
  }
  return eventType.replaceAll("_", " ");
}

/** Map persisted activity_log rows to ActivityTimeline entries (ALW-699). */
export function mapActivityRowsToTimeline(
  rows: DocumentActivityRow[]
): ActivityTimelineEntry[] {
  return rows.map((row) => ({
    id: row.id,
    at: row.createdAt,
    field: humanizeEventType(row.eventType),
    value: row.summary ?? humanizeEventType(row.eventType),
    ...(row.actorId ? { actor: row.actorId } : {}),
  }));
}
