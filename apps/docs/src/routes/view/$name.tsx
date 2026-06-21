import { createFileRoute, notFound } from "@tanstack/react-router";
import { getEntry } from "@workspace/registry";
import { TooltipProvider } from "@workspace/ui/components/shadcn/tooltip";
import { Suspense } from "react";

/**
 * Chromeless full-screen block route.
 *
 * Renders a single block from the registry with NO docs layout (no sidebar, no
 * header) — just the root theme/background. The docs gallery embeds this in an
 * iframe (see `BlockViewer`) and links to it for "open full screen". This is the
 * TanStack equivalent of shadcn's isolated `/view/[name]` route.
 *
 * A `TooltipProvider` wraps every block here because the app-shell primitives
 * (sidebar menu buttons, etc.) render tooltips; the starter's `SidebarProvider`
 * doesn't bundle one.
 */
export const Route = createFileRoute("/view/$name")({
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

  const Block = entry.component;

  return (
    <TooltipProvider>
      <Suspense fallback={null}>
        <Block />
      </Suspense>
    </TooltipProvider>
  );
}

function BlockNotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-2 p-6 text-center">
      <p className="font-medium text-sm">Block not found</p>
      <p className="text-muted-foreground text-sm">
        No block is registered under this name.
      </p>
    </div>
  );
}
