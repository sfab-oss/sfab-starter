import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { getEntry } from "@workspace/registry";
import { TooltipProvider } from "@workspace/ui/components/shadcn/tooltip";
import { Suspense } from "react";
import { BlockNotFound } from "@/components/not-found";

const LEGACY_VIEW_REDIRECTS: Record<string, string> = {
  "app-shell": "shell",
  "list-page-shell": "shell",
  "record-page-shell": "shell",
  "operator-home": "today-overview",
  "hoy-overview": "today-overview",
  "master-data-list-page": "resource-list-page",
  "coming-soon-page": "resource-list-page",
  button: "shell",
  badge: "resource-table",
  "money-fields": "resource-table",
  "money-display": "resource-table",
  "status-badges": "resource-table",
  "filter-preset-bar": "resource-table",
  "primary-action-bar": "shell",
  "side-sheet-host": "shell",
  "confirm-ladder": "shell",
  "contract-form": "shell",
  "collection-preset-empty": "resource-table",
  "collection-empty-cta": "resource-table",
  "collection-error-retry": "resource-table",
  "collection-skeleton": "resource-table",
  "collection-stale": "resource-table",
};

/**
 * Chromeless full-screen registry preview — no docs layout. Embedded by
 * `BlockViewer` and linked from component previews for "open full screen".
 */
export const Route = createFileRoute("/view/$name")({
  beforeLoad: ({ params }) => {
    const target = LEGACY_VIEW_REDIRECTS[params.name];
    if (target) {
      throw redirect({ to: "/view/$name", params: { name: target } });
    }
  },
  loader: ({ params }) => {
    if (!getEntry(params.name)) {
      throw notFound();
    }
    return { name: params.name };
  },
  component: ViewBlock,
  notFoundComponent: BlockNotFound,
});

function ViewBlock() {
  const { name } = Route.useLoaderData();
  const entry = getEntry(name);

  if (!entry) {
    return <BlockNotFound />;
  }

  const Preview = entry.component;

  return (
    <TooltipProvider delayDuration={0}>
      <Suspense fallback={null}>
        <Preview />
      </Suspense>
    </TooltipProvider>
  );
}
