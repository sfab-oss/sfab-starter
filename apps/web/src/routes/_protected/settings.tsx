"use client";

import { createFileRoute, Link } from "@tanstack/react-router";
import { authClient } from "@workspace/auth/client";
import { AppBreadcrumbs } from "@workspace/ui/components/brand/app-breadcrumbs";
import {
  ShellContent,
  ShellHeader,
  ShellHeaderActions,
  ShellHeaderSidebarTrigger,
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
import { useState } from "react";
import { InviteMemberForm } from "@/components/organization/members/invite-member-form";
import {
  InvitationsTable,
  MembersTable,
} from "@/components/organization/members/members-table";
import { OrganizationDetailsForm } from "@/components/organization/settings/organization-details-form";
import {
  type SettingsNavSection,
  SettingsSectionLayout,
} from "@/components/organization/settings/settings-nav";

export const Route = createFileRoute("/_protected/settings")({
  component: SettingsPage,
});

const SETTINGS_GENERAL = "/settings/general";
const SETTINGS_MEMBERS = "/settings/members";

const ORGANIZATION_SETTINGS_SECTIONS: SettingsNavSection[] = [
  {
    label: "Organization",
    items: [
      { to: SETTINGS_GENERAL, label: "General" },
      { to: SETTINGS_MEMBERS, label: "Members" },
    ],
  },
];

function SettingsPage() {
  const [activePath, setActivePath] = useState(SETTINGS_GENERAL);
  const { data: activeOrganization, isPending } =
    authClient.useActiveOrganization();

  if (isPending) {
    return <SettingsSkeleton activePath={activePath} />;
  }

  if (!activeOrganization) {
    return (
      <ShellPage>
        <ShellHeader>
          <ShellHeaderSidebarTrigger className="-ml-1" />
          <AppBreadcrumbs items={[{ title: "Settings" }]} />
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
        <ShellHeaderActions />
      </ShellHeader>

      <ShellContent>
        <SettingsSectionLayout
          activePath={activePath}
          onItemSelect={setActivePath}
          sections={ORGANIZATION_SETTINGS_SECTIONS}
        >
          {activePath === SETTINGS_GENERAL ? (
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
          ) : null}

          {activePath === SETTINGS_MEMBERS ? (
            <>
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
            </>
          ) : null}
        </SettingsSectionLayout>
      </ShellContent>
    </ShellPage>
  );
}

function SettingsSkeleton({ activePath }: { activePath: string }) {
  return (
    <ShellPage>
      <ShellHeader>
        <ShellHeaderSidebarTrigger className="-ml-1" />
        <AppBreadcrumbs items={[{ title: "Settings" }]} />
        <ShellHeaderActions />
      </ShellHeader>
      <ShellContent>
        <SettingsSectionLayout
          activePath={activePath}
          sections={ORGANIZATION_SETTINGS_SECTIONS}
        >
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
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
        </SettingsSectionLayout>
      </ShellContent>
    </ShellPage>
  );
}
