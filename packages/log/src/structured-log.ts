/**
 * Single-line structured logging helper (ALW-700).
 *
 * Emits one JSON object per call to the Workers Logs console mirror. Downstream
 * consumers (dashboard filters, detectors) parse the same envelope. Console-first;
 * secondary sinks (D1 activity UI) are a separate concern (ALW-699).
 *
 * @see docs/engineering/structured-logging.md
 */

import type { LogKind } from "./kinds.js";

export type { LogKind } from "./kinds.js";
export type LogSeverity = "debug" | "info" | "warn" | "error";

/**
 * Canonical envelope fields. Additional payload keys are allowed and flattened
 * onto the same object (wide-event style). `kind` must be a registered
 * {@link LogKind}.
 */
export interface StructuredLogEvent {
  /** Stable event name — see `LOG_KINDS` / the engineering doc. */
  kind: LogKind;
  organizationId?: string | null;
  /** Defaults to `info` when omitted. */
  severity?: LogSeverity;
  userId?: string | null;
  [key: string]: unknown;
}

/**
 * Emit one structured log line. Console-first: always writes a single-line JSON
 * string via the matching `console.*` method for `severity`. Never throws.
 *
 * Secret-free by convention — callers must not pass tokens, cookies, or
 * Authorization headers. Prefer `error: errorMessage(err)` over raw Error objects.
 */
export function structuredLog(event: StructuredLogEvent): void {
  const severity: LogSeverity = event.severity ?? "info";
  const envelope: StructuredLogEvent = {
    ...event,
    severity,
  };

  let line: string;
  try {
    line = JSON.stringify(envelope);
  } catch {
    // Circular / non-serializable payload — keep a minimal breadcrumb rather
    // than dropping the event entirely.
    line = JSON.stringify({
      kind: event.kind,
      severity,
      error: "structured_log_serialize_failed",
    });
  }

  switch (severity) {
    case "error":
      console.error(line);
      break;
    case "warn":
      console.warn(line);
      break;
    case "debug":
      console.debug(line);
      break;
    default:
      console.log(line);
      break;
  }
}

/** Normalize an unknown thrown value to a string for the `error` field. */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}
