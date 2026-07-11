import { listActivity } from "@workspace/core/activity";
import { z } from "zod";
import type { AgentToolsContext } from "../../types";
import { defineOrgTool } from "../define-org-tool";

// Read-only activity/event timeline tool (ALW-402). The `kind: "event"` rows the
// transaction hub writes inside finalize (document finalized, payment recorded)
// surface here — the human-readable history for grounding "what happened"
// questions. Read-only.
export const createActivityReadTools = (
  ctx: Pick<AgentToolsContext, "organizationId">
) => {
  const orgId = ctx.organizationId;
  return {
    list_activity: defineOrgTool({
      description:
        "List the org's recent activity/event timeline (document finalize and payment events), newest first. Optionally filter by entity.",
      inputSchema: z.object({
        entityType: z
          .string()
          .optional()
          .describe("Filter to one entity type (e.g. 'document', 'entity')."),
        entityId: z
          .string()
          .optional()
          .describe("Filter to activity for a single entity id."),
        limit: z
          .number()
          .int()
          .positive()
          .max(200)
          .optional()
          .describe("Max rows to return (default 50)."),
      }),
      execute: async ({ entityType, entityId, limit }) =>
        listActivity(orgId, { entityType, entityId, limit }),
    }),
  };
};
