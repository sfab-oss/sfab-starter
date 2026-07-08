import type { ToolSet } from "ai";
import type { AgentToolsContext } from "../types";
import {
  createDocumentTools,
  createProductReadTools,
  createProductTools,
} from "./catalog";
import { createDisplayTools } from "./display";
import { createTransactionReadTools } from "./transaction";

/**
 * Org-agent ERP reach.
 *
 * Writes: read/write **catalog products** only. Every write tool passes the
 * RBAC `assertCan("catalog:write")` guard (see ./guard.ts). No money or
 * document *mutation* tool exists — that invariant is deliberate (money/document
 * changes hand off to the real screen), so nothing here ever authors financial
 * state.
 *
 * Reads (ALW-402): catalog products/documents PLUS read-only reach into the
 * transaction core (payments/allocations, wallet balance + ledger), people /
 * entities (AR balance, credit limit), the org's settings, and the activity
 * timeline — every one a thin org-scoped `@workspace/core` query. These need
 * only `organizationId`, so they also compose for the read-only sub-agent below.
 *
 * Still deferred: durable `action()` tool approvals overlap [[ALW-348]] and are
 * reconciled there; per-tool role authorization beyond `assertCan` is [[ALW-400]].
 */
export const getOrgAgentTools = (ctx: AgentToolsContext): ToolSet => ({
  ...createProductTools(ctx),
  ...createDocumentTools(ctx),
  ...createTransactionReadTools(ctx),
});

export const getOrgAgentDisplayTools = (ctx: AgentToolsContext): ToolSet =>
  createDisplayTools(ctx);

/**
 * Read-only reach for delegated sub-agents (see `OrgSubAgent`): the catalog
 * reads (list/get products, list/get documents) plus the transaction-core /
 * people / settings / activity reads (ALW-402). No write tools, so no
 * RBAC/`userId` is needed — the composition takes only the `organizationId`,
 * which the sub-agent derives from its trusted parent path. Money/document
 * mutations remain off the agent entirely (guard.ts invariant), so a sub-agent
 * can never author state.
 */
export const getOrgAgentReadOnlyTools = (
  ctx: Pick<AgentToolsContext, "organizationId">
): ToolSet => ({
  ...createProductReadTools(ctx),
  ...createDocumentTools(ctx),
  ...createTransactionReadTools(ctx),
});
