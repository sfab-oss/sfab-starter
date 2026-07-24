/**
 * Canonical structured-log `kind` vocabulary (ALW-700).
 *
 * Single source of truth: call sites must pass a `LogKind` (enforced by
 * TypeScript). Prefer extending this array when introducing a **new** kind;
 * do not rename existing ones without a migration plan for downstream filters.
 *
 * Keep the starter list small — add a kind only when a real call site needs it.
 */

export const LOG_KINDS = [
  "catalog_search_failed",
  "email_send_failed",
  "email_sent",
  "org_chat_auto_compaction_failed",
  "org_chat_touch_failed",
  "org_chat_turn_failed",
  "org_chat_usage_compaction_failed",
  "org_sub_agent_auto_compaction_failed",
  "transcription_failed",
  "unhandled_error",
] as const;

export type LogKind = (typeof LOG_KINDS)[number];
