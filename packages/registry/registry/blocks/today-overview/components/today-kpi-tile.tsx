"use client";

import { cn } from "@workspace/ui/lib/utils";

export function TodayKpiTile({
  title,
  value,
  hint,
  emptyMessage,
  size = "default",
  className,
  ...props
}: React.ComponentProps<"div"> & {
  title: string;
  value?: React.ReactNode;
  hint?: string;
  emptyMessage?: string;
  size?: "default" | "featured" | "compact";
}) {
  const isEmpty = value === undefined && emptyMessage !== undefined;
  const isFeatured = size === "featured";
  const isCompact = size === "compact";

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col rounded-lg border bg-muted/20",
        isFeatured && "gap-2 bg-muted/30 p-5 sm:p-6",
        isCompact && "gap-1.5 p-4",
        !(isFeatured || isCompact) && "gap-2 p-4",
        className
      )}
      data-slot="today-kpi-tile"
      {...props}
    >
      <p
        className={cn(
          "text-muted-foreground",
          isCompact ? "text-xs" : "text-sm"
        )}
      >
        {title}
      </p>
      {isEmpty ? (
        <p
          className={cn(
            "text-muted-foreground leading-snug",
            isCompact ? "text-xs" : "text-sm"
          )}
        >
          {emptyMessage}
        </p>
      ) : (
        <p
          className={cn(
            "font-semibold tabular-nums tracking-tight",
            isFeatured ? "text-4xl sm:text-5xl" : "text-3xl",
            isCompact && "text-2xl"
          )}
        >
          {value}
        </p>
      )}
      {hint ? (
        <p className="mt-auto text-muted-foreground text-xs">{hint}</p>
      ) : null}
    </div>
  );
}
