import type { AgentToolsContext } from "../types";

/** Shared execute context for every binder (in-app today; MCP later). */
export type ToolContext = AgentToolsContext;

/**
 * Read-only binders (OrgSubAgent) have no acting user. Write pieces are not
 * registered on that binder, so `userId` is never read.
 */
export function readOnlyToolContext(organizationId: string): ToolContext {
  return {
    organizationId,
    userId: "",
    waitUntil: () => undefined,
  };
}
