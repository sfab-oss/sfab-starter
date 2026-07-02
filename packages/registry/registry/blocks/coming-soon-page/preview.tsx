"use client";

/**
 * GALLERY-ONLY preview entrypoint (`item.ts` `preview: "preview"`). Composes the
 * three shipped placeholder components into one realistic shell and flips between
 * them with the shared dock. None of this is in the block's `files` list, so
 * production installs ship only `page.tsx` + `components/page-placeholder.tsx`.
 */

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
import { PreviewStateDock } from "../../_shared/preview-state-dock";
import { RegistryQueryProvider } from "../../_shared/registry-query-provider";
import {
  ComingSoonPage,
  EmptyResourcePage,
  NotFoundPage,
} from "./components/page-placeholder";
import {
  PLACEHOLDER_PREVIEW_MODES,
  type PlaceholderPreviewMode,
  PlaceholderPreviewProvider,
  usePlaceholderPreviewControls,
  usePlaceholderPreviewMode,
} from "./hooks/use-placeholder-preview";

const PREVIEW_CONTEXT: Record<
  PlaceholderPreviewMode,
  { activeId: string; crumb: string }
> = {
  "coming-soon": { activeId: "buy", crumb: "Buy" },
  "not-found": { activeId: "today", crumb: "Not found" },
  empty: { activeId: "sell", crumb: "Sell" },
};

function PlaceholderPreviewShell() {
  const mode = usePlaceholderPreviewMode();
  const { activeId, crumb } = PREVIEW_CONTEXT[mode];

  return (
    <Shell sidebar={<AppShellSidebar activeId={activeId} />}>
      <ShellInset>
        <ShellPage>
          <ShellHeader>
            <ShellHeaderSidebarTrigger className="-ml-1" />
            <AppBreadcrumbs items={[{ title: crumb }]} showHome={false} />
          </ShellHeader>
          <ShellContent className="overflow-auto">
            {mode === "coming-soon" ? <ComingSoonPage /> : null}
            {mode === "not-found" ? <NotFoundPage /> : null}
            {mode === "empty" ? <EmptyResourcePage /> : null}
          </ShellContent>
        </ShellPage>
      </ShellInset>
    </Shell>
  );
}

function PreviewControls() {
  const controls = usePlaceholderPreviewControls();

  if (!controls) {
    return null;
  }

  return (
    <PreviewStateDock
      onValueChange={(value) =>
        controls.setMode(value as PlaceholderPreviewMode)
      }
      options={PLACEHOLDER_PREVIEW_MODES}
      value={controls.mode}
    />
  );
}

export default function ComingSoonPagePreview() {
  return (
    <RegistryQueryProvider>
      <PlaceholderPreviewProvider>
        <PlaceholderPreviewShell />
        <PreviewControls />
      </PlaceholderPreviewProvider>
    </RegistryQueryProvider>
  );
}
