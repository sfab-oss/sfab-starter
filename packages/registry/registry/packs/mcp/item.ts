import type { RegistryItemDef } from "../../../src/types";

const def: RegistryItemDef = {
  item: {
    name: "mcp",
    type: "registry:block",
    title: "MCP server",
    description:
      "Opt-in MCP OAuth + Streamable HTTP. Connection is the org. DCR on. No CIMD.",
    meta: { sfabKind: "pack" },
    docs: [
      "Files landed under apps/web (src/mcp, src/_pack/mcp, routes, tests).",
      "Open apps/web/src/_pack/mcp/skill.md and run it: it moves layer files into",
      "packages/*, grafts, generate/migrate, then deletes the staging dir.",
    ].join("\n"),
    files: [
      {
        path: "skill.md",
        type: "registry:file",
        target: "src/_pack/mcp/skill.md",
      },
      {
        path: "db/schema/oauth.ts",
        type: "registry:lib",
        target: "src/_pack/mcp/db/schema/oauth.ts",
      },
      {
        path: "contract/mcp-connections.ts",
        type: "registry:lib",
        target: "src/_pack/mcp/contract/mcp-connections.ts",
      },
      {
        path: "core/mcp.ts",
        type: "registry:lib",
        target: "src/_pack/mcp/core/mcp.ts",
      },
      {
        path: "auth/mcp-resource.ts",
        type: "registry:lib",
        target: "src/_pack/mcp/auth/mcp-resource.ts",
      },
      {
        path: "auth/mcp-resource.test.ts",
        type: "registry:file",
        target: "src/_pack/mcp/auth/mcp-resource.test.ts",
      },
      {
        path: "tools/mcp-tool.ts",
        type: "registry:lib",
        target: "src/_pack/mcp/agent/mcp-tool.ts",
      },
      {
        path: "tools/mcp-tool-names.ts",
        type: "registry:lib",
        target: "src/_pack/mcp/agent/mcp-tool-names.ts",
      },
      {
        path: "tools/register-mcp-tools.ts",
        type: "registry:lib",
        target: "src/_pack/mcp/agent/register-mcp-tools.ts",
      },
      {
        path: "tools/register-mcp-tools.test.ts",
        type: "registry:file",
        target: "src/_pack/mcp/agent/register-mcp-tools.test.ts",
      },
      {
        path: "i18n/en.json",
        type: "registry:file",
        target: "src/_pack/mcp/i18n/en.json",
      },
      {
        path: "i18n/es.json",
        type: "registry:file",
        target: "src/_pack/mcp/i18n/es.json",
      },
      {
        path: "server/mcp/index.ts",
        type: "registry:lib",
        target: "src/mcp/index.ts",
      },
      {
        path: "server/mcp/check-mcp-origin.ts",
        type: "registry:lib",
        target: "src/mcp/check-mcp-origin.ts",
      },
      {
        path: "server/mcp/consent-handler.ts",
        type: "registry:lib",
        target: "src/mcp/consent-handler.ts",
      },
      {
        path: "server/mcp/validate-consent-origin.ts",
        type: "registry:lib",
        target: "src/mcp/validate-consent-origin.ts",
      },
      {
        path: "server/hono/mcp.ts",
        type: "registry:lib",
        target: "src/hono/org-protected/mcp.ts",
      },
      {
        path: "components/mcp-settings-section.tsx",
        type: "registry:component",
        target: "src/components/organization/settings/mcp-settings-section.tsx",
      },
      {
        path: "hooks/use-mcp-connections.ts",
        type: "registry:hook",
        target: "src/hooks/use-mcp-connections.ts",
      },
      {
        path: "lib/restore-signed-oauth-query.ts",
        type: "registry:lib",
        target: "src/lib/restore-signed-oauth-query.ts",
      },
      {
        path: "lib/restore-signed-oauth-query.test.ts",
        type: "registry:file",
        target: "src/lib/restore-signed-oauth-query.test.ts",
      },
      {
        path: "routes/mcp.consent.tsx",
        type: "registry:page",
        target: "~/src/routes/mcp.consent.tsx",
      },
      {
        path: "routes/settings-mcp.tsx",
        type: "registry:page",
        target: "~/src/routes/_protected/settings/mcp.tsx",
      },
      {
        path: "test/mcp.workerd.test.ts",
        type: "registry:file",
        target: "~/test/api/mcp.workerd.test.ts",
      },
      {
        path: "test/helpers/mcp-oauth.ts",
        type: "registry:file",
        target: "~/test/helpers/mcp-oauth.ts",
      },
    ],
  },
};

export default def;
