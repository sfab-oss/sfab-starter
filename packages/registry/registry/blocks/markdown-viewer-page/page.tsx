"use client";

import { AppBreadcrumbs } from "@workspace/ui/components/brand/app-breadcrumbs";
import { MarkdownEditor } from "@workspace/ui/components/brand/markdown-editor";
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
import { SAMPLE_MARKDOWN } from "./lib/sample-markdown";

export default function MarkdownViewerPage() {
  return (
    <RegistryQueryProvider>
      <Shell sidebar={<AppShellSidebar activeId="documents" />}>
        <ShellInset>
          <ShellPage>
            <ShellHeader>
              <ShellHeaderSidebarTrigger className="-ml-1" />
              <AppBreadcrumbs
                items={[{ title: "Documents" }, { title: "Service agreement" }]}
                showHome={false}
              />
              <ShellHeaderActions>
                <Button size="sm" type="button" variant="outline">
                  <Download className="size-4" />
                  Download
                </Button>
              </ShellHeaderActions>
            </ShellHeader>
            <ShellContent className="overflow-y-auto">
              <div className="mx-auto w-full max-w-3xl px-4 py-6">
                <MarkdownEditor readOnly value={SAMPLE_MARKDOWN} />
              </div>
            </ShellContent>
          </ShellPage>
        </ShellInset>
      </Shell>
    </RegistryQueryProvider>
  );
}
