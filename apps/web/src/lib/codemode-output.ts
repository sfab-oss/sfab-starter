/**
 * Shape of `tool-codemode` part output (from `@cloudflare/codemode` ProxyToolOutput,
 * plus a client-side `rejected` status Think may surface after reject/expire).
 */
export interface CodemodePendingAction {
  method?: string;
  args?: unknown;
  executionId?: string;
  seq?: number;
  connector?: string;
}

export interface CodemodeAppliedWrite {
  method: string;
  args?: unknown;
}

export interface CodemodeOutput {
  status: "paused" | "completed" | "rejected" | "error";
  executionId: string;
  pending?: CodemodePendingAction[];
  /** Applied write tools from the execution log (ungated create/update path). */
  appliedWrites?: CodemodeAppliedWrite[];
  result?: unknown;
  error?: string;
  reason?: string;
}

export function isCodemodeOutput(value: unknown): value is CodemodeOutput {
  if (!value || typeof value !== "object") {
    return false;
  }
  const o = value as Record<string, unknown>;
  if (typeof o.executionId !== "string" || typeof o.status !== "string") {
    return false;
  }
  return (
    o.status === "paused" ||
    o.status === "completed" ||
    o.status === "rejected" ||
    o.status === "error"
  );
}

export function asCodemodeOutput(value: unknown): CodemodeOutput | null {
  return isCodemodeOutput(value) ? value : null;
}
