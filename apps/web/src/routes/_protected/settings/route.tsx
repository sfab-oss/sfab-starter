"use client";

import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
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
import { Skeleton } from "@workspace/ui/components/shadcn/skeleton";
import {
  type SettingsNavSection,
  SettingsSectionLayout,
} from "@/components/organization/settings/settings-nav";

export const Route = createFileRoute("/_protected/settings")({
  component: SettingsLayout,
});

const ORGANIZATION_SETTINGS_SECTIONS: SettingsNavSection[] = [
  {
    label: "Organization",
    items: [
      { to: "/settings/general", label: "General" },
      { to: "/settings/members", label: "Members" },
    ],
  },
];

function SettingsLayout() {
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

  return (
    <ShellPage>
      <ShellHeader>
        <ShellHeaderSidebarTrigger className="-ml-1" />
        <AppBreadcrumbs items={[{ title: "Settings" }]} />
        <ShellHeaderActions />
      </ShellHeader>

      <ShellContent>
        <SettingsSectionLayout sections={ORGANIZATION_SETTINGS_SECTIONS}>
          <Outlet />
        </SettingsSectionLayout>
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
        <ShellHeaderActions />
      </ShellHeader>
      <ShellContent>
        <SettingsSectionLayout sections={ORGANIZATION_SETTINGS_SECTIONS}>
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-64 w-full" />
        </SettingsSectionLayout>
      </ShellContent>
    </ShellPage>
  );
}
