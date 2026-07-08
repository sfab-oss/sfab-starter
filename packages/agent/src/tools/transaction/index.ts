import type { ToolSet } from "ai";
import type { AgentToolsContext } from "../../types";
import { createActivityReadTools } from "./activity";
import { createEntityReadTools } from "./entities";
import { createOrganizationReadTools } from "./organization";
import { createPaymentReadTools } from "./payments";
import { createWalletReadTools } from "./wallet";

export { createActivityReadTools } from "./activity";
export { createEntityReadTools } from "./entities";
export { createOrganizationReadTools } from "./organization";
export { createPaymentReadTools } from "./payments";
export { createWalletReadTools } from "./wallet";

/**
 * ALW-402 — read-only reach into the transaction core, people/entities, and org
 * settings. Every tool is a thin, org-scoped wrapper over a `@workspace/core`
 * query; none mutate. It needs only `organizationId`, so it composes for both
 * the parent `OrgChat` and the read-only delegation sub-agent.
 */
export const createTransactionReadTools = (
  ctx: Pick<AgentToolsContext, "organizationId">
): ToolSet => ({
  ...createPaymentReadTools(ctx),
  ...createWalletReadTools(ctx),
  ...createEntityReadTools(ctx),
  ...createOrganizationReadTools(ctx),
  ...createActivityReadTools(ctx),
});
