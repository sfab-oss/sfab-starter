import { createFileRoute, Link } from "@tanstack/react-router";
import { authClient } from "@workspace/auth/client";
import { AppBreadcrumbs } from "@workspace/ui/components/brand/app-breadcrumbs";
import {
  ShellContent,
  ShellHeader,
  ShellHeaderActions,
  ShellHeaderSidebarTrigger,
  ShellHeaderTitle,
  ShellPage,
} from "@workspace/ui/components/brand/shell";
import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/shadcn/card";
import { Separator } from "@workspace/ui/components/shadcn/separator";
import { Skeleton } from "@workspace/ui/components/shadcn/skeleton";
import { UserPlus } from "lucide-react";
import { InviteMemberForm } from "@/components/organization/members/invite-member-form";
import {
  InvitationsTable,
  MembersTable,
} from "@/components/organization/members/members-table";
import { OrganizationDetailsForm } from "@/components/organization/settings/organization-details-form";

export const Route = createFileRoute("/_protected/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { data: activeOrganization, isPending } =
    authClient.useActiveOrganization();

  if (isPending) {
    return <SettingsSkeleton />;
  }

  if (!activeOrganization) {
    return (
      <ShellPage>
        <ShellHeader>
          <ShellHeaderSidebarTrigger className="-ml-1" />
          <AppBreadcrumbs items={[{ title: "Settings" }]} />
          <ShellHeaderTitle>Settings</ShellHeaderTitle>
          <ShellHeaderActions />
        </ShellHeader>
        <ShellContent>
          <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
            <p className="text-muted-foreground">No active organization</p>
            <Button asChild>
              <Link to="/onboarding">Create an organization</Link>
            </Button>
          </div>
        </ShellContent>
      </ShellPage>
    );
  }

  const members = activeOrganization.members ?? [];
  const invitations = activeOrganization.invitations ?? [];

  return (
    <ShellPage>
      <ShellHeader>
        <ShellHeaderSidebarTrigger className="-ml-1" />
        <AppBreadcrumbs items={[{ title: "Settings" }]} />
        <ShellHeaderTitle>Settings</ShellHeaderTitle>
        <ShellHeaderActions />
      </ShellHeader>

      <ShellContent>
        <div className="mx-auto w-full max-w-4xl space-y-8 py-8">
          <div>
            <h1 className="font-bold text-2xl">Organization Settings</h1>
            <p className="text-muted-foreground">
              Manage your organization settings and team members
            </p>
          </div>

          <Separator />

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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Invite People to {activeOrganization.name}
              </CardTitle>
              <CardDescription>
                Invite new members to your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InviteMemberForm />
            </CardContent>
          </Card>

          <Separator />

          <div>
            <h2 className="mb-4 font-bold text-xl">Members</h2>
            <MembersTable members={members} />
          </div>

          <Separator />

          <div>
            <h2 className="mb-4 font-bold text-xl">Pending Invitations</h2>
            <InvitationsTable invitations={invitations} />
          </div>
        </div>
      </ShellContent>
    </ShellPage>
  );
}

function SettingsSkeleton() {
  return (
    <ShellPage>
      <ShellHeader>
        <ShellHeaderSidebarTrigger className="-ml-1" />
        <AppBreadcrumbs items={[{ title: "Settings" }]} />
        <ShellHeaderTitle>Settings</ShellHeaderTitle>
        <ShellHeaderActions />
      </ShellHeader>
      <ShellContent>
        <div className="mx-auto w-full max-w-4xl space-y-8 py-8">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Separator />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-60" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-32" />
            </CardContent>
          </Card>
        </div>
      </ShellContent>
    </ShellPage>
  );
}
