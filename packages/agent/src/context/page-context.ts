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
    "What the user is viewing in the app while this chat is open:",
    `- Page: ${ctx.page}`,
  ];

  const { params } = ctx;
  if (params.entityType) {
    lines.push(`- Entity type: ${params.entityType}`);
  }
  if (params.entityId) {
    // IDs are the tool handle — always surface explicitly when present.
    lines.push(`- Id: ${params.entityId}`);
  }
  if (params.title) {
    lines.push(`- Title: ${params.title}`);
  }
  // Prerequisite retrieval for every contextual page (not product-only).
  // Keep lightweight: type/id/title here; full state via tools.
  if (params.entityId) {
    lines.push(
      `- Before answering about this page, fetch current state with the matching get_*/list_* tool using id \`${params.entityId}\` (via codemode).`
    );
  } else {
    lines.push(
      "- Before answering about this page, fetch current state with the matching get_*/list_* tool (via codemode)."
    );
  }

  return lines.join("\n");
}
