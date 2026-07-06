"use client";

import { AppBreadcrumbs } from "@workspace/ui/components/brand/app-breadcrumbs";
import {
  Shell,
  ShellContent,
  ShellHeader,
  ShellHeaderActions,
  ShellHeaderSidebarTrigger,
  ShellInset,
  ShellPage,
} from "@workspace/ui/components/brand/shell";
import { SpreadsheetViewer } from "@workspace/ui/components/brand/spreadsheet-viewer";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Download } from "lucide-react";
import { AppShellSidebar } from "../../_shared/app-shell-sidebar";
import { RegistryQueryProvider } from "../../_shared/registry-query-provider";
import { SAMPLE_WORKBOOK } from "./lib/sample-workbook";

export default function SpreadsheetViewerPage() {
  return (
    <RegistryQueryProvider>
      <Shell sidebar={<AppShellSidebar activeId="documents" />}>
        <ShellInset>
          <ShellPage>
            <ShellHeader>
              <ShellHeaderSidebarTrigger className="-ml-1" />
              <AppBreadcrumbs
                items={[{ title: "Documents" }, { title: "Q3 sales.xlsx" }]}
                showHome={false}
              />
              <ShellHeaderActions>
                <Button size="sm" type="button" variant="outline">
                  <Download className="size-4" />
                  Download
                </Button>
              </ShellHeaderActions>
            </ShellHeader>
            <ShellContent>
              <SpreadsheetViewer
                className="rounded-none border-0"
                file={SAMPLE_WORKBOOK}
              />
            </ShellContent>
          </ShellPage>
        </ShellInset>
      </Shell>
    </RegistryQueryProvider>
  );
}
