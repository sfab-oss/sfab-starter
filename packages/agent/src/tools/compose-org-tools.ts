import type { ToolSet } from "ai";
import type { AgentToolsContext } from "../types";
import {
  createDocumentTools,
  createProductApprovalTools,
  createProductReadTools,
  createProductTools,
} from "./catalog";
import { createDisplayTools } from "./display";
import { createTransactionReadTools } from "./transaction";

/**
 * Org-agent ERP reach — the **codemode-bound** tools (exposed inside the
 * `execute` sandbox). This set is autonomous: every tool runs to completion the
 * moment the model calls it (no human gate).
 *
 * Per-tool-class approval rule (ALW-348 — full detail in
 * `docs/guides/agent-tool-approvals.md`):
 *  1. **Autonomous + RBAC** (here): reversible catalog writes (`create-product`,
 *     `update-product`). Gated only by `assertCan("catalog:write")` (./guard.ts).
 *  2. **Top-level human approval**: destructive / high-stakes writes are hoisted
 *     OUT of codemode into {@link getOrgAgentApprovalTools} with
 *     `needsApproval`, so a call pauses for an in-chat Approve/Reject. RBAC still
 *     applies post-approval.
 *  3. **No agent tool at all**: money & document *mutations* — they hand off to
 *     the real screen and are never authored from chat (guard.ts invariant).
 *
 * Reads (ALW-402): catalog products/documents PLUS read-only reach into the
 * transaction core (payments/allocations, wallet balance + ledger), people /
 * entities (AR balance, credit limit), the org's settings, and the activity
 * timeline — every one a thin org-scoped `@workspace/core` query. These need
 * only `organizationId`, so they also compose for the read-only sub-agent below.
 *
 * Still deferred: durable in-codemode `action()` pause/approve (class 2's
 * mid-script variant) overlaps [[ALW-348]] and is reconciled there; per-tool
 * role authorization beyond `assertCan` is [[ALW-400]].
 */
export const getOrgAgentTools = (ctx: AgentToolsContext): ToolSet => ({
  ...createProductTools(ctx),
  ...createDocumentTools(ctx),
  ...createTransactionReadTools(ctx),
});

/**
 * Human-approval-gated tools (ALW-348), exposed **top-level** (as siblings of
 * `codemode`, NOT inside the sandbox) so the standard AI-SDK approval flow can
 * pause the call for an in-chat Approve/Reject. Currently just `delete-product`.
 * Kept separate from {@link getOrgAgentTools} so the codemode set stays purely
 * autonomous and a gated tool is never accidentally routed through the sandbox.
 */
export const getOrgAgentApprovalTools = (ctx: AgentToolsContext): ToolSet =>
  createProductApprovalTools(ctx);

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
