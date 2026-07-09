/** Keep in sync with `tools/display.ts` and UI `tool-registry.tsx`. */
export const DISPLAY_TOOL_NAMES = {
  PRODUCT_LIST: "display_product_list",
  MEMORY: "display_memory",
} as const;

export type DisplayToolName =
  (typeof DISPLAY_TOOL_NAMES)[keyof typeof DISPLAY_TOOL_NAMES];

/**
 * Thrown by the RBAC guard (`tools/guard.ts`) when the caller's role isn't
 * allowed to run a write tool. It crosses the wire as the tool part's
 * `errorText`, so the chat UI matches on this exact string to render a calm
 * "not permitted" affordance instead of a generic red error (ALW-401 AC-3).
 */
export const PERMISSION_DENIED_MESSAGE =
  "You don't have permission to perform this action.";
