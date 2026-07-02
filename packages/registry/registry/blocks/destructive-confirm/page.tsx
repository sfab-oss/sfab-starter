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
import { DestructiveConfirmCard } from "./components/destructive-confirm-card";

export default function DestructiveConfirmPage() {
  return (
    <RegistryQueryProvider>
      <Shell sidebar={<AppShellSidebar activeId="settings" />}>
        <ShellInset>
          <ShellPage>
            <ShellHeader>
              <ShellHeaderSidebarTrigger className="-ml-1" />
              <AppBreadcrumbs
                items={[{ title: "Settings" }, { title: "Danger zone" }]}
                showHome={false}
              />
            </ShellHeader>
            <ShellContent className="overflow-auto">
              <div className="mx-auto w-full max-w-2xl px-4 py-6">
                <DestructiveConfirmCard />
              </div>
            </ShellContent>
          </ShellPage>
        </ShellInset>
        <Toaster />
      </Shell>
    </RegistryQueryProvider>
  );
}
