import { createFileRoute } from "@tanstack/react-router";
import { authClient } from "@workspace/auth/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/shadcn/card";
import { OrganizationDetailsForm } from "@/components/organization/settings/organization-details-form";

export const Route = createFileRoute("/_protected/settings/general")({
  component: GeneralSettingsPage,
});

function GeneralSettingsPage() {
  const { data: activeOrganization } = authClient.useActiveOrganization();

  if (!activeOrganization) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Details</CardTitle>
        <CardDescription>
          Update your organization name and slug
        </CardDescription>
      </CardHeader>
      <CardContent>
        <OrganizationDetailsForm organization={activeOrganization} />
      </CardContent>
    </Card>
  );
}
