"use client";

import { cn } from "@workspace/ui/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  BrainIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Loader2Icon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Streamdown } from "streamdown";
import { useOrgMemory } from "@/hooks/use-org-memory";
import { m } from "@/paraglide/messages.js";

function MarkdownBody({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <Streamdown
      className={cn(
        "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className
      )}
    >
      {children}
    </Streamdown>
  );
}

const COLLAPSED_MAX_HEIGHT = "8rem";

type MemoryVariant = "inline" | "dialog";

export function MemoryCard({
  className,
  showHeader = true,
  variant = "inline",
}: {
  className?: string;
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
          <span>{m.chat_org_memory()}</span>
          <span className="ml-auto font-normal">{m.chat_memory_shared()}</span>
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
        {m.chat_memory_loading()}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="px-4 py-4 text-muted-foreground text-xs">
        {m.chat_memory_load_failed()}
      </p>
    );
  }

  if (!content) {
    return (
      <p className="px-4 py-4 text-muted-foreground text-xs">
        {m.chat_memory_empty()}
      </p>
    );
  }

  return (
    <>
      {variant === "dialog" ? (
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <MarkdownBody>{content}</MarkdownBody>
        </div>
      ) : (
        <CollapsibleMemoryContent content={content} />
      )}
      {updatedAt ? (
        <div className="border-t px-4 py-1.5 text-[11px] text-muted-foreground">
          {m.chat_memory_updated({
            relative: formatDistanceToNow(updatedAt, { addSuffix: true }),
          })}
        </div>
      ) : null}
    </>
  );
}

function CollapsibleMemoryContent({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const collapsedRef = useRef<HTMLDivElement>(null);

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
          <MarkdownBody>{content}</MarkdownBody>
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
          <MarkdownBody>{content}</MarkdownBody>
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
