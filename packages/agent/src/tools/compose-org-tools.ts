import type { ToolSet } from "ai";
import type { AgentToolsContext } from "../types";
import {
  createDocumentTools,
  createProductReadTools,
  createProductTools,
} from "./catalog";
import { createDisplayTools } from "./display";
import { createTransactionReadTools } from "./transaction";

/** Codemode-bound ERP tools. Authoring guide: `docs/guides/writing-agent-tools.md`. */
export const getOrgAgentTools = (ctx: AgentToolsContext): ToolSet => ({
  ...createProductTools(ctx),
  ...createDocumentTools(ctx),
  ...createTransactionReadTools(ctx),
});

export const getOrgAgentDisplayTools = (ctx: AgentToolsContext): ToolSet =>
  createDisplayTools(ctx);

/** Read-only reach for delegated sub-agents (`OrgSubAgent`). */
export const getOrgAgentReadOnlyTools = (
  ctx: Pick<AgentToolsContext, "organizationId">
): ToolSet => ({
  ...createProductReadTools(ctx),
  ...createDocumentTools(ctx),
  ...createTransactionReadTools(ctx),
});
