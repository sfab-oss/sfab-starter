---
name: mcp
description: >-
  How this repo's **opt-in** MCP OAuth pack works (Streamable HTTP at /mcp after
  `shadcn add`, org-bound grants, DCR, Settings). Use when changing the mcp pack,
  MCP routes, consent, Settings MCP, OAuth tables, MCP tools, or Origin/JWT
  checks. Triggers: MCP, /mcp, OAuth consent, DCR, mcp_organization_grant,
  Cursor MCP URL, shadcn add mcp.
---

# MCP skill

Read [`docs/guides/mcp.md`](../../../docs/guides/mcp.md). This skill does not
repeat the guide.

## Hard rules

1. Tools have no `organizationId` input. Org comes from the grant.
2. Verify JWTs in-process. Do not `fetch` a same-Worker `jwksUrl`.
3. Keep DCR on. Do not add CIMD unless a task says to.
4. Do not add `delete_product` or `display_*` on the MCP catalog.
5. Do not move `packages/agent/src/tool-parts/` into the pack.
6. Cursor as a client is configured from Settings, not `AGENTS.md`.
7. Pack install does not write `_journal.json` or drop numbered SQL. The
   installer runs `pnpm db:generate` then `pnpm db:migrate`.
