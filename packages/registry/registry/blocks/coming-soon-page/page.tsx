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
import { ComingSoonPage } from "./components/page-placeholder";

export default function BuyComingSoonPage() {
  return (
    <RegistryQueryProvider>
      <Shell sidebar={<AppShellSidebar activeId="buy" />}>
        <ShellInset>
          <ShellPage>
            <ShellHeader>
              <ShellHeaderSidebarTrigger className="-ml-1" />
              <AppBreadcrumbs items={[{ title: "Buy" }]} showHome={false} />
            </ShellHeader>
            <ShellContent className="overflow-auto">
              <ComingSoonPage />
            </ShellContent>
          </ShellPage>
        </ShellInset>
      </Shell>
    </RegistryQueryProvider>
  );
}
