/** Keep in sync with `tools/display.ts` and UI `tool-registry.tsx`. */
export const DISPLAY_TOOL_NAMES = {
  PRODUCT_LIST: "display_product_list",
  MEMORY: "display_memory",
} as const;

export type DisplayToolName =
  (typeof DISPLAY_TOOL_NAMES)[keyof typeof DISPLAY_TOOL_NAMES];

/**
 * Mutating tools exposed inside codemode (`tools.*`). Keep in sync with the
 * web invalidation registry (`agent-tool-invalidation-registry.ts`). Used when
 * attaching `appliedWrites` on completed codemode output so read-only log
 * entries never leave the DO.
 */
export const AGENT_WRITE_TOOL_NAMES = [
  "create_product",
  "update_product",
  "delete_product",
] as const;

export type AgentWriteToolName = (typeof AGENT_WRITE_TOOL_NAMES)[number];

/**
 * Thrown by the RBAC guard (`tools/guard.ts`) when the caller's role isn't
 * allowed to run a write tool. It crosses the wire as the tool part's
 * `errorText`, so the chat UI matches on this exact string to render a calm
 * "not permitted" affordance instead of a generic red error (ALW-401 AC-3).
 */
export const PERMISSION_DENIED_MESSAGE =
  "You don't have permission to perform this action.";
