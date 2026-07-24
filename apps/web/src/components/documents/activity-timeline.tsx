"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/shadcn/collapsible";
import { cn } from "@workspace/ui/lib/utils";
import { ChevronDownIcon } from "lucide-react";

export interface ActivityTimelineEntry {
  id: string;
  /** ISO-8601 timestamp — displayed as `YYYY-MM-DD HH:mm`. */
  at: string;
  /** Event type label — e.g. "document finalized". */
  field: string;
  /** Human-readable summary (or richer node). */
  value: React.ReactNode;
  /** Optional actor display string. */
  actor?: string;
}

function formatActivityAt(at: string): string {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) {
    return at;
  }

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

export type ActivityTimelineProps = React.ComponentProps<"section"> & {
  entries: ActivityTimelineEntry[];
  title?: string;
  emptyLabel?: string;
  whenLabel?: string;
  fieldLabel?: string;
  valueLabel?: string;
  defaultOpen?: boolean;
};

export function ActivityTimeline({
  entries,
  title = "Activity",
  emptyLabel = "No activity yet.",
  whenLabel = "When",
  fieldLabel = "Event",
  valueLabel = "Summary",
  defaultOpen = true,
  className,
  ...props
}: ActivityTimelineProps) {
  return (
    <section className={cn(className)} data-slot="activity-timeline" {...props}>
      <Collapsible defaultOpen={defaultOpen}>
        <CollapsibleTrigger
          className="group flex w-full items-center justify-between gap-2 py-2.5 text-left text-sm transition-colors hover:text-foreground"
          data-slot="activity-timeline-trigger"
        >
          <span className="font-medium">{title}</span>
          <span className="flex items-center gap-2 text-muted-foreground">
            <span className="text-xs tabular-nums">{entries.length}</span>
            <ChevronDownIcon className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
          </span>
        </CollapsibleTrigger>

        <CollapsibleContent data-slot="activity-timeline-content">
          {entries.length === 0 ? (
            <p className="pb-3 text-muted-foreground text-sm">{emptyLabel}</p>
          ) : (
            <div className="overflow-x-auto pb-3">
              <table
                className="w-full min-w-[280px] text-sm"
                data-slot="activity-timeline-table"
              >
                <thead>
                  <tr className="text-muted-foreground text-xs">
                    <th className="pr-3 pb-2 text-left font-normal">
                      {whenLabel}
                    </th>
                    <th className="pr-3 pb-2 text-left font-normal">
                      {fieldLabel}
                    </th>
                    <th className="pb-2 text-left font-normal">{valueLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr className="border-border/60 border-t" key={entry.id}>
                      <td className="py-2 pr-3 align-top text-muted-foreground">
                        <span className="whitespace-nowrap tabular-nums">
                          {formatActivityAt(entry.at)}
                        </span>
                        {entry.actor ? (
                          <span className="block text-xs">{entry.actor}</span>
                        ) : null}
                      </td>
                      <td className="py-2 pr-3 align-top">{entry.field}</td>
                      <td className="py-2 align-top font-medium">
                        {entry.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}
