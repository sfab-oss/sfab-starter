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
import { AppShellSidebar } from "../../_shared/app-shell-sidebar";
import { RegistryQueryProvider } from "../../_shared/registry-query-provider";
import { TodayOverviewContent } from "./components/today-overview-content";

function TodayOverviewPageContent() {
  return (
    <Shell sidebar={<AppShellSidebar activeId="today" />}>
      <ShellInset>
        <ShellPage>
          <ShellHeader>
            <ShellHeaderSidebarTrigger className="-ml-1" />
            <AppBreadcrumbs items={[{ title: "Today" }]} showHome={false} />
          </ShellHeader>
          <ShellContent className="overflow-y-auto">
            <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
              <TodayOverviewContent />
            </div>
          </ShellContent>
        </ShellPage>
      </ShellInset>
    </Shell>
  );
}

export default function TodayOverviewPage() {
  return (
    <RegistryQueryProvider>
      <TodayOverviewPageContent />
    </RegistryQueryProvider>
  );
}
