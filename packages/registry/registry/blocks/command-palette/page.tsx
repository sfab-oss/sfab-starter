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

/** Gallery: command palette open on load — sidebar search and ⌘K use the same dialog. */
function CommandPalettePageContent() {
  return (
    <Shell
      sidebar={<AppShellSidebar activeId="today" initialCommandPaletteOpen />}
    >
      <ShellInset>
        <ShellPage>
          <ShellHeader>
            <ShellHeaderSidebarTrigger className="-ml-1" />
            <AppBreadcrumbs items={[{ title: "Today" }]} showHome={false} />
          </ShellHeader>
          <ShellContent>
            <div className="flex flex-1 items-center justify-center p-8 text-center text-muted-foreground text-sm">
              <p className="max-w-md">
                The command palette is open by default in this preview. Use the
                sidebar search button or press ⌘K to toggle it.
              </p>
            </div>
          </ShellContent>
        </ShellPage>
      </ShellInset>
    </Shell>
  );
}

export default function CommandPalettePage() {
  return (
    <RegistryQueryProvider>
      <CommandPalettePageContent />
    </RegistryQueryProvider>
  );
}
