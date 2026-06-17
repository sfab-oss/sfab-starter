"use client";

import { MessageResponse } from "@workspace/ui/components/ai-elements/message";
import { cn } from "@workspace/ui/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  BrainIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Loader2Icon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useOrgMemory } from "@/hooks/use-org-memory";

/** Collapsed inline height — shows the first few lines before "Show more". */
const COLLAPSED_MAX_HEIGHT = "8rem";

type MemoryVariant = "inline" | "dialog";

/**
 * Read-only view of the organization's shared, cross-chat agent memory. Backs both
 * surfaces: the chat-header "Memory" dialog and the `display-memory` inline
 * card the agent renders in the transcript. Fetches its own data via
 * `useOrgMemory`, so each surface just renders `<MemoryCard />`.
 *
 * - `variant="inline"` (default): collapses to a few lines with a "Show more"
 *   toggle that expands to a capped, scrollable height.
 * - `variant="dialog"`: fills its (height-constrained) container and scrolls
 *   internally so the dialog itself never grows past the viewport.
 */
export function MemoryCard({
  className,
  showHeader = true,
  variant = "inline",
}: {
  className?: string;
  /** Show the card's own "Organization memory" header. Hidden in the dialog, where
   *  the dialog title already labels it. */
  showHeader?: boolean;
  variant?: MemoryVariant;
}) {
  const { data, isLoading, isError } = useOrgMemory();
  const content = data?.content?.trim() ?? "";
  const updatedAt = data?.updatedAt ?? null;

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-md border bg-card text-sm",
        variant === "dialog" && "flex-1",
        className
      )}
    >
      {showHeader ? (
        <div className="flex items-center gap-1.5 border-b px-4 py-2 font-medium text-muted-foreground text-xs">
          <BrainIcon aria-hidden="true" className="size-3.5" />
          <span>Organization memory</span>
          <span className="ml-auto font-normal">Shared across all chats</span>
        </div>
      ) : null}

      <MemoryBody
        content={content}
        isError={isError}
        isLoading={isLoading}
        updatedAt={updatedAt}
        variant={variant}
      />
    </div>
  );
}

function MemoryBody({
  content,
  isError,
  isLoading,
  updatedAt,
  variant,
}: {
  content: string;
  isError: boolean;
  isLoading: boolean;
  updatedAt: number | null;
  variant: MemoryVariant;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-4 text-muted-foreground text-xs">
        <Loader2Icon aria-hidden="true" className="size-3.5 animate-spin" />
        Loading memory…
      </div>
    );
  }

  if (isError) {
    return (
      <p className="px-4 py-4 text-muted-foreground text-xs">
        Couldn't load organization memory.
      </p>
    );
  }

  if (!content) {
    return (
      <p className="px-4 py-4 text-muted-foreground text-xs">
        Nothing saved yet. As we work, I'll note durable facts here — policies,
        conventions, and constraints — so every chat in this organization shares
        them.
      </p>
    );
  }

  return (
    <>
      {variant === "dialog" ? (
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <MessageResponse>{content}</MessageResponse>
        </div>
      ) : (
        <CollapsibleMemoryContent content={content} />
      )}
      {updatedAt ? (
        <div className="border-t px-4 py-1.5 text-[11px] text-muted-foreground">
          Updated {formatDistanceToNow(updatedAt, { addSuffix: true })}
        </div>
      ) : null}
    </>
  );
}

/**
 * Inline memory body: starts collapsed at `COLLAPSED_MAX_HEIGHT` with a bottom
 * fade, and reveals a "Show more" toggle only when the content actually
 * overflows that height. Expanding caps at `max-h-96` and scrolls.
 */
function CollapsibleMemoryContent({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const collapsedRef = useRef<HTMLDivElement>(null);

  // Measure overflow against the collapsed height. Re-measures via
  // ResizeObserver because the markdown renderer lays out asynchronously.
  useEffect(() => {
    if (expanded) {
      return;
    }
    const el = collapsedRef.current;
    if (!el) {
      return;
    }
    const measure = () => {
      setCanExpand(el.scrollHeight - el.clientHeight > 4);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [expanded]);

  if (expanded) {
    return (
      <>
        <div className="scrollbar-thin max-h-96 overflow-y-auto px-4 py-3">
          <MessageResponse>{content}</MessageResponse>
        </div>
        <ToggleButton expanded onClick={() => setExpanded(false)} />
      </>
    );
  }

  return (
    <>
      <div className="relative">
        <div
          className="overflow-hidden px-4 py-3"
          ref={collapsedRef}
          style={{ maxHeight: COLLAPSED_MAX_HEIGHT }}
        >
          <MessageResponse>{content}</MessageResponse>
        </div>
        {canExpand ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card to-transparent" />
        ) : null}
      </div>
      {canExpand ? (
        <ToggleButton expanded={false} onClick={() => setExpanded(true)} />
      ) : null}
    </>
  );
}

function ToggleButton({
  expanded,
  onClick,
}: {
  expanded: boolean;
  onClick: () => void;
}) {
  const Icon = expanded ? ChevronUpIcon : ChevronDownIcon;
  return (
    <button
      className="relative z-10 flex w-full items-center justify-center gap-1 px-4 py-1.5 font-medium text-[11px] text-muted-foreground shadow-[0_-6px_8px_-6px_rgba(0,0,0,0.18)] transition-colors hover:bg-muted/50 hover:text-foreground"
      onClick={onClick}
      type="button"
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {expanded ? "Show less" : "Show more"}
    </button>
  );
}
