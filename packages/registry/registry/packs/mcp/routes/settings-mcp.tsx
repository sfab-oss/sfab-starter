import { createFileRoute } from "@tanstack/react-router";
import { McpSettingsSection } from "@/components/organization/settings/mcp-settings-section";

export const Route = createFileRoute("/_protected/settings/mcp")({
  component: McpSettingsPage,
});

function McpSettingsPage() {
  return <McpSettingsSection />;
}
