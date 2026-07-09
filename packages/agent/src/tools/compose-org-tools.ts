import type { ToolSet } from "ai";
import type { AgentToolsContext } from "../types";
import {
  createDocumentTools,
  createProductReadTools,
  createProductTools,
} from "./catalog";
import { createDisplayTools } from "./display";
import { createTransactionReadTools } from "./transaction";

/** Codemode-bound ERP tools. Approval classes: `docs/guides/agent-tool-approvals.md`. */
export const getOrgAgentTools = (ctx: AgentToolsContext): ToolSet => ({
  ...createProductTools(ctx),
  ...createDocumentTools(ctx),
  ...createTransactionReadTools(ctx),
});

/** @deprecated Gated writes live in {@link getOrgAgentTools}. */
export const getOrgAgentApprovalTools = (
  _ctx: AgentToolsContext
): ToolSet => ({});

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
