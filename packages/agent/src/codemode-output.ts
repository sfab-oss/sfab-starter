/**
 * Detect codemode tool results that report failure via `{ error: "…" }` while the
 * execution wrapper still surfaces `status: "completed"` (post-approve throw path).
 */
export function codemodeFailureMessage(result: unknown): string | undefined {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return;
  }
  const record = result as Record<string, unknown>;
  // ToolResult soft failures (`{ ok: false, error }`) are intentional — not
  // outer codemode execution errors.
  if ("ok" in record && typeof record.ok === "boolean") {
    return;
  }
  const error = record.error;
  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }
}

/** Map stored codemode status to the UI badge state (Completed vs Error). */
export function codemodeDisplayStatus<T extends string>(
  status: T,
  result?: unknown
): T | "error" {
  if (status === "completed" && codemodeFailureMessage(result)) {
    return "error";
  }
  return status;
}

interface CodemodeCompletedOutput {
  status?: string;
  result?: unknown;
  executionId?: string;
  error?: string;
  appliedWrites?: unknown[];
}

/** Rewrite completed codemode output when result carries `{ error: "…" }`. */
export function codemodeCompletedAsErrorIfFailed<
  T extends CodemodeCompletedOutput,
>(
  output: T
): (T & { status: "error"; error: string; appliedWrites: [] }) | null {
  if (output.status !== "completed") {
    return null;
  }
  const message = codemodeFailureMessage(output.result);
  if (!message) {
    return null;
  }
  return {
    ...output,
    status: "error",
    error: message,
    appliedWrites: [],
  };
}
