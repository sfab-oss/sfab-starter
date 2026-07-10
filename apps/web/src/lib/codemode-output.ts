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

export function asCodemodeOutput(value: unknown): CodemodeOutput | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const o = value as Record<string, unknown>;
  if (typeof o.executionId !== "string" || typeof o.status !== "string") {
    return null;
  }
  if (
    o.status !== "paused" &&
    o.status !== "completed" &&
    o.status !== "rejected" &&
    o.status !== "error"
  ) {
    return null;
  }
  return o as unknown as CodemodeOutput;
}
