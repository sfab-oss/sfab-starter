"use client";

import { AppBreadcrumbs } from "@workspace/ui/components/brand/app-breadcrumbs";
import { PdfViewer } from "@workspace/ui/components/brand/pdf-viewer";
import {
  Shell,
  ShellContent,
  ShellHeader,
  ShellHeaderActions,
  ShellHeaderSidebarTrigger,
  ShellInset,
  ShellPage,
} from "@workspace/ui/components/brand/shell";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Download } from "lucide-react";
import { AppShellSidebar } from "../../_shared/app-shell-sidebar";
import { RegistryQueryProvider } from "../../_shared/registry-query-provider";
import { SAMPLE_PDF } from "./lib/sample-pdf";

export default function PdfViewerPage() {
  return (
    <RegistryQueryProvider>
      <Shell sidebar={<AppShellSidebar activeId="documents" />}>
        <ShellInset>
          <ShellPage>
            <ShellHeader>
              <ShellHeaderSidebarTrigger className="-ml-1" />
              <AppBreadcrumbs
                items={[{ title: "Documents" }, { title: "Statement.pdf" }]}
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
              <PdfViewer className="rounded-none border-0" file={SAMPLE_PDF} />
            </ShellContent>
          </ShellPage>
        </ShellInset>
      </Shell>
    </RegistryQueryProvider>
  );
}
