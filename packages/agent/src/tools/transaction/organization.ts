import { getOrganizationSummary } from "@workspace/core/organizations";
import { tool } from "ai";
import { z } from "zod";
import type { AgentToolsContext } from "../../types";

// Read-only organization/settings tool (ALW-402). Surfaces the org's basic
// identity for grounding; org mutations are never agent tools.
export const createOrganizationReadTools = (
  ctx: Pick<AgentToolsContext, "organizationId">
) => {
  const orgId = ctx.organizationId;
  return {
    get_organization: tool({
      description:
        "Get this organization's basic settings (id, name, slug). Use to ground answers about the current org.",
      inputSchema: z.object({}),
      execute: async () => getOrganizationSummary(orgId),
    }),
  };
};
