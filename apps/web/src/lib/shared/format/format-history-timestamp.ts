import { formatDistanceToNow } from "date-fns";

export function formatHistoryTimestamp(timestamp: number): string {
  return formatDistanceToNow(timestamp, { addSuffix: true });
}
