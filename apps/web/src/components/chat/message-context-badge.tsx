import type { AIMetadata } from "@workspace/contract/ai";
import {
  ChatToken,
  ChatTokenIcon,
  ChatTokenLabel,
} from "@workspace/ui/components/shadcn/chat-token";
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
    <TooltipProvider delay={300}>
      <Tooltip>
        <TooltipTrigger render={<ChatToken className={cn(className)} />}>
          <ChatTokenIcon>
            <Icon aria-hidden="true" />
          </ChatTokenIcon>
          <ChatTokenLabel>{label}</ChatTokenLabel>
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
