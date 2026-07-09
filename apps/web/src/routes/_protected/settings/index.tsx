import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/settings/")({
  component: SettingsIndex,
});

function SettingsIndex() {
  return <Navigate replace to="/settings/general" />;
}
