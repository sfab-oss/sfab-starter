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
  if (params.view && Object.keys(params.view).length > 0) {
    const viewSummary = Object.entries(params.view)
      .map(([key, value]) => `${key}=${String(value)}`)
      .join(" ");
    lines.push(`- View: ${viewSummary}`);
    lines.push(
      "- This view fingerprint mirrors the user's visible list filters (URL-backed). Use it when answering about what they are looking at; fetch rows via list_* tools — do not assume row payloads here."
    );
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
