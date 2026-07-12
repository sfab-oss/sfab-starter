"use client";

import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { authClient } from "@workspace/auth/client";
import { AppBreadcrumbs } from "@workspace/ui/components/brand/app-breadcrumbs";
import {
  ShellContent,
  ShellHeader,
  ShellHeaderActions,
  ShellPage,
} from "@workspace/ui/components/brand/shell";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Skeleton } from "@workspace/ui/components/shadcn/skeleton";
import { ShellHeaderSidebarTrigger } from "@/components/layout/shell-header-sidebar-trigger";
import {
  type SettingsNavSection,
  SettingsSectionLayout,
} from "@/components/organization/settings/settings-nav";
import { m } from "@/paraglide/messages.js";

export const Route = createFileRoute("/_protected/settings")({
  component: SettingsLayout,
});

function settingsSections(): SettingsNavSection[] {
  return [
    {
      label: m.settings_section_organization(),
      items: [
        {
          to: "/settings/general",
          label: m.settings_general(),
        },
        {
          to: "/settings/members",
          label: m.settings_members(),
        },
      ],
    },
  ];
}

function SettingsLayout() {
  const { data: activeOrganization, isPending } =
    authClient.useActiveOrganization();
  const sections = settingsSections();
  if (isPending) {
    return <SettingsSkeleton sections={sections} />;
  }
  if (!activeOrganization) {
    return (
      <ShellPage>
        <ShellHeader>
          <ShellHeaderSidebarTrigger className="-ml-1" />
          <AppBreadcrumbs
            ellipsisAriaLabel={m.breadcrumb_ellipsis_aria()}
            homeLabel={m.nav_home()}
            items={[
              {
                title: m.settings_title(),
              },
            ]}
          />
          <ShellHeaderActions />
        </ShellHeader>
        <ShellContent>
          <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
            <p className="text-muted-foreground">{m.org_no_active()}</p>
            <Button render={<Link to="/onboarding" />}>{m.org_create()}</Button>
          </div>
        </ShellContent>
      </ShellPage>
    );
  }
  return (
    <ShellPage>
      <ShellHeader>
        <ShellHeaderSidebarTrigger className="-ml-1" />
        <AppBreadcrumbs
          ellipsisAriaLabel={m.breadcrumb_ellipsis_aria()}
          homeLabel={m.nav_home()}
          items={[
            {
              title: m.settings_title(),
            },
          ]}
        />
        <ShellHeaderActions />
      </ShellHeader>

      <ShellContent>
        <SettingsSectionLayout sections={sections}>
          <Outlet />
        </SettingsSectionLayout>
      </ShellContent>
    </ShellPage>
  );
}
function SettingsSkeleton({ sections }: { sections: SettingsNavSection[] }) {
  return (
    <ShellPage>
      <ShellHeader>
        <ShellHeaderSidebarTrigger className="-ml-1" />
        <AppBreadcrumbs
          ellipsisAriaLabel={m.breadcrumb_ellipsis_aria()}
          homeLabel={m.nav_home()}
          items={[
            {
              title: m.settings_title(),
            },
          ]}
        />
        <ShellHeaderActions />
      </ShellHeader>
      <ShellContent>
        <SettingsSectionLayout sections={sections}>
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
