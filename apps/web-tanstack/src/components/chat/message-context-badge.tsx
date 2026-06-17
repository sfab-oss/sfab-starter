import type { AIMetadata } from "@workspace/types/ai";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/shadcn/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { iconForPageContextMeta } from "./page-context-chip";

type PageContextMeta = NonNullable<AIMetadata["pageContext"]>;

function badgeLabel(ctx: PageContextMeta): string | null {
  return ctx.params.title ?? ctx.params.entityType ?? ctx.page ?? null;
}

function summary(ctx: PageContextMeta): string {
  const parts = [ctx.params.title ?? ctx.page];
  if (ctx.params.entityType && ctx.params.entityId) {
    parts.push(`${ctx.params.entityType} (${ctx.params.entityId})`);
  }
  return parts.filter(Boolean).join(" · ");
}

export function MessageContextBadge({
  pageContext,
  className,
}: {
  pageContext: PageContextMeta;
  className?: string;
}) {
  const label = badgeLabel(pageContext);
  if (!label) {
    return null;
  }

  const Icon = iconForPageContextMeta(pageContext);

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground",
              className
            )}
          >
            <Icon aria-hidden="true" className="size-3 shrink-0" />
            <span className="truncate">{label}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs" side="top">
          <span className="font-medium">Sent with page context</span>
          <br />
          {summary(pageContext)}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
