import { createFileRoute } from "@tanstack/react-router";
import { authClient } from "@workspace/auth/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/shadcn/card";
import { Separator } from "@workspace/ui/components/shadcn/separator";
import { OrganizationDangerZone } from "@/components/organization/settings/organization-danger-zone";
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
    <div className="space-y-8">
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

      <Separator />

      <OrganizationDangerZone organization={activeOrganization} />
    </div>
  );
}
