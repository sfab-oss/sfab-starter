import { getOrganizationSummary } from "@workspace/core/organizations";
import { z } from "zod";
import type { ToolContext } from "../context";

export const getOrganizationName = "get_organization";

export const getOrganizationDescription =
  "Get this organization's basic settings (id, name, slug). Use to ground answers about the current org.";

export const getOrganizationInputSchema = z.object({});

export async function getOrganizationExecute(
  ctx: ToolContext,
  _input: z.infer<typeof getOrganizationInputSchema>
): Promise<unknown> {
  return await getOrganizationSummary(ctx.organizationId);
}
