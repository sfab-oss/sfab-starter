import { getEntry } from "@workspace/registry";
import { Button } from "@workspace/ui/components/shadcn/button";
import { TooltipProvider } from "@workspace/ui/components/shadcn/tooltip";
import { Fullscreen } from "lucide-react";
import { Suspense } from "react";

/**
 * ComponentPreview — renders a `registry:ui` demo inline (direct render, no
 * iframe) in a centered, bordered surface. The lightweight counterpart to
 * `BlockViewer`: components are small and self-contained, so they live in the
 * docs page; only full-page blocks need iframe isolation.
 */
export function ComponentPreview({ name }: { name: string }) {
  const entry = getEntry(name);

  if (!entry) {
    return (
      <div className="not-prose rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-destructive text-sm">
        Unknown component: <code>{name}</code>
      </div>
    );
  }

  const Demo = entry.component;

  return (
    <div className="not-prose overflow-hidden rounded-xl border">
      <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-1.5">
        <span className="font-medium text-sm">{entry.title ?? entry.name}</span>
        <Button
          asChild
          className="ml-auto size-7 rounded-sm p-0"
          size="icon"
          variant="ghost"
        >
          <a
            href={`/view/${entry.name}`}
            rel="noreferrer"
            target="_blank"
            title="Open full screen"
          >
            <Fullscreen className="size-4" />
            <span className="sr-only">Open full screen</span>
          </a>
        </Button>
      </div>
      <div className="flex min-h-56 items-center justify-center p-10">
        <TooltipProvider delayDuration={0}>
          <Suspense fallback={null}>
            <Demo />
          </Suspense>
        </TooltipProvider>
      </div>
    </div>
  );
}
