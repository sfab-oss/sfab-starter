import type { OrgPageContext } from "../types";

export function getLatestUserPageContext(
  messages: readonly { role: string; metadata?: unknown }[]
): OrgPageContext | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message?.role !== "user" || !message.metadata) {
      continue;
    }
    const pageContext = (message.metadata as { pageContext?: OrgPageContext })
      .pageContext;
    if (pageContext) {
      return pageContext;
    }
  }
  return undefined;
}

export function buildPageContextSection(ctx: OrgPageContext): string {
  const lines = [
    "## Current page context",
    "",
    "The user sent their last message while viewing:",
    `- Page: ${ctx.page}`,
  ];

  const { params } = ctx;
  if (params.entityType && params.entityId) {
    lines.push(`- Entity: ${params.entityType} (${params.entityId})`);
    if (params.entityType === "product") {
      lines.push(
        `- Hint: Use codemode \`get-product\` with id \`${params.entityId}\` for current state.`
      );
    }
  }
  if (params.title) {
    lines.push(`- Title: ${params.title}`);
  }

  return lines.join("\n");
}
