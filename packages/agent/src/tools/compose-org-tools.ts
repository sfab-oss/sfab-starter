import type { ToolSet } from "ai";
import type { AgentToolsContext } from "../types";
import {
  createDocumentTools,
  createProductReadTools,
  createProductTools,
} from "./catalog";
import { createDisplayTools } from "./display";

/**
 * ALW-398 AC-5 — org-agent tool audit (decision: keep lean, defer breadth).
 *
 * Current reach (intentional): read/write **catalog products** and **read**
 * documents. Every write tool passes the RBAC `assertCan("catalog:write")`
 * guard (see ./guard.ts). No money or document *mutation* tool exists — that
 * invariant is deliberate (money/document changes hand off to the real screen),
 * so the transaction core (payments/wallet/settlement — ALW-354/ALW-355) is
 * intentionally NOT wired here.
 *
 * Deferred to a follow-up (see ALW-398 AC-6): broader **read-only** reach into
 * the transaction core, people, and settings, plus evaluating the new Think
 * 0.11+ capabilities — `@cloudflare/think/tools/fetch` (SSRF-guarded GET),
 * durable `action()` approvals, and tool-lifecycle hooks. Durable tool
 * approvals overlap [[ALW-348]] and should be reconciled there rather than
 * adopted piecemeal now.
 */
export const getOrgAgentTools = (ctx: AgentToolsContext): ToolSet => ({
  ...createProductTools(ctx),
  ...createDocumentTools(ctx),
});

export const getOrgAgentDisplayTools = (ctx: AgentToolsContext): ToolSet =>
  createDisplayTools(ctx);

/**
 * Read-only reach for delegated sub-agents (see `OrgSubAgent`): list/get
 * catalog products and list documents. No write tools, so no RBAC/`userId` is
 * needed — the composition takes only the `organizationId`, which the sub-agent
 * derives from its trusted parent path. Money/document mutations remain off the
 * agent entirely (guard.ts invariant), so a sub-agent can never author state.
 */
export const getOrgAgentReadOnlyTools = (
  ctx: Pick<AgentToolsContext, "organizationId">
): ToolSet => ({
  ...createProductReadTools(ctx),
  ...createDocumentTools(ctx),
});
