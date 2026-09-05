import type { RegistryItemDef } from "../../../src/types";

const def: RegistryItemDef = {
  item: {
    name: "mcp",
    type: "registry:block",
    title: "MCP server",
    description:
      "Opt-in MCP OAuth + Streamable HTTP. Connection is the org. DCR on. No CIMD.",
    meta: { sfabKind: "pack" },
    files: [
      { path: "skill.md", type: "registry:file", target: "skill.md" },
      {
        path: "db/schema/oauth.ts",
        type: "registry:lib",
        target: "packages/db/src/schema/oauth.ts",
      },
      {
        path: "contract/mcp-connections.ts",
        type: "registry:lib",
        target: "packages/contract/src/mcp-connections.ts",
      },
      {
        path: "core/mcp.ts",
        type: "registry:lib",
        target: "packages/core/src/mcp.ts",
      },
      {
        path: "auth/mcp-resource.ts",
        type: "registry:lib",
        target: "packages/auth/src/mcp-resource.ts",
      },
      {
        path: "auth/mcp-resource.test.ts",
        type: "registry:file",
        target: "packages/auth/src/mcp-resource.test.ts",
      },
      {
        path: "tools/mcp-tool.ts",
        type: "registry:lib",
        target: "packages/agent/src/mcp/mcp-tool.ts",
      },
      {
        path: "tools/mcp-tool-names.ts",
        type: "registry:lib",
        target: "packages/agent/src/mcp/mcp-tool-names.ts",
      },
      {
        path: "tools/compose-mcp-tools.ts",
        type: "registry:lib",
        target: "packages/agent/src/mcp/compose-mcp-tools.ts",
      },
      {
        path: "tools/compose-mcp-tools.test.ts",
        type: "registry:file",
        target: "packages/agent/src/mcp/compose-mcp-tools.test.ts",
      },
      {
        path: "server/mcp/index.ts",
        type: "registry:lib",
        target: "apps/web/src/mcp/index.ts",
      },
      {
        path: "server/mcp/check-mcp-origin.ts",
        type: "registry:lib",
        target: "apps/web/src/mcp/check-mcp-origin.ts",
      },
      {
        path: "server/mcp/consent-handler.ts",
        type: "registry:lib",
        target: "apps/web/src/mcp/consent-handler.ts",
      },
      {
        path: "server/mcp/validate-consent-origin.ts",
        type: "registry:lib",
        target: "apps/web/src/mcp/validate-consent-origin.ts",
      },
      {
        path: "server/hono/mcp.ts",
        type: "registry:lib",
        target: "apps/web/src/hono/org-protected/mcp.ts",
      },
      {
        path: "components/mcp-settings-section.tsx",
        type: "registry:component",
        target:
          "apps/web/src/components/organization/settings/mcp-settings-section.tsx",
      },
      {
        path: "hooks/use-mcp-connections.ts",
        type: "registry:hook",
        target: "apps/web/src/hooks/use-mcp-connections.ts",
      },
      {
        path: "lib/restore-signed-oauth-query.ts",
        type: "registry:lib",
        target: "apps/web/src/lib/restore-signed-oauth-query.ts",
      },
      {
        path: "lib/restore-signed-oauth-query.test.ts",
        type: "registry:file",
        target: "apps/web/src/lib/restore-signed-oauth-query.test.ts",
      },
      {
        path: "routes/mcp.consent.tsx",
        type: "registry:page",
        target: "apps/web/src/routes/mcp.consent.tsx",
      },
      {
        path: "routes/settings-mcp.tsx",
        type: "registry:page",
        target: "apps/web/src/routes/_protected/settings/mcp.tsx",
      },
      {
        path: "test/mcp.workerd.test.ts",
        type: "registry:file",
        target: "apps/web/test/api/mcp.workerd.test.ts",
      },
      {
        path: "test/helpers/mcp-oauth.ts",
        type: "registry:file",
        target: "apps/web/test/helpers/mcp-oauth.ts",
      },
      {
        path: "i18n/en.json",
        type: "registry:file",
        target: "packages/i18n/messages/mcp-en.json",
      },
      {
        path: "i18n/es.json",
        type: "registry:file",
        target: "packages/i18n/messages/mcp-es.json",
      },
      {
        path: "docs/mcp.md",
        type: "registry:file",
        target: "docs/guides/mcp.md",
      },
      {
        path: "agents-skill.md",
        type: "registry:file",
        target: ".agents/skills/mcp/SKILL.md",
      },
    ],
  },
};

export default def;
