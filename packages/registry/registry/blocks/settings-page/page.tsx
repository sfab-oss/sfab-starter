"use client";

import { AppBreadcrumbs } from "@workspace/ui/components/brand/app-breadcrumbs";
import {
  Shell,
  ShellContent,
  ShellHeader,
  ShellHeaderSidebarTrigger,
  ShellInset,
  ShellPage,
} from "@workspace/ui/components/brand/shell";
import { Toaster } from "@workspace/ui/components/shadcn/sonner";
import { AppShellSidebar } from "../../_shared/app-shell-sidebar";
import { RegistryQueryProvider } from "../../_shared/registry-query-provider";
import { SettingsPageContent } from "./components/settings-page-content";

function SettingsPageContentWrapper() {
  return (
    <Shell sidebar={<AppShellSidebar activeId="settings" />}>
      <ShellInset>
        <ShellPage>
          <ShellHeader>
            <ShellHeaderSidebarTrigger className="-ml-1" />
            <AppBreadcrumbs items={[{ title: "Settings" }]} showHome={false} />
          </ShellHeader>
          <ShellContent>
            <SettingsPageContent />
          </ShellContent>
        </ShellPage>
      </ShellInset>
      <Toaster />
    </Shell>
  );
}

export default function SettingsPage() {
  return (
    <RegistryQueryProvider>
      <SettingsPageContentWrapper />
    </RegistryQueryProvider>
  );
}
