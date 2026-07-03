import { db } from "@workspace/db";
import { activityLog } from "@workspace/db/schema";
import { and, desc, eq } from "drizzle-orm";

/**
 * Read the unified activity/event timeline (transaction-core.md §7–§8). The
 * `kind: "event"` rows the hub writes inside finalize surface here as the
 * human-readable history on a document or the org.
 */
export function listActivity(
  orgId: string,
  filter?: { entityType?: string; entityId?: string; limit?: number }
) {
  const conditions = [eq(activityLog.organizationId, orgId)];
  if (filter?.entityType) {
    conditions.push(eq(activityLog.entityType, filter.entityType));
  }
  if (filter?.entityId) {
    conditions.push(eq(activityLog.entityId, filter.entityId));
  }
  return db
    .select()
    .from(activityLog)
    .where(and(...conditions))
    .orderBy(desc(activityLog.createdAt))
    .limit(filter?.limit ?? 50);
}
