"use client";

import { Button } from "@workspace/ui/components/shadcn/button";
import { cn } from "@workspace/ui/lib/utils";
import { ChevronRightIcon } from "lucide-react";

export interface TodayActionItem {
  id: string;
  label: string;
  description?: string;
}

export function TodayActionItems({
  items,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  items: TodayActionItem[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className={cn("space-y-2", className)}
      data-slot="today-action-items"
      {...props}
    >
      <h2 className="font-medium text-sm">Needs attention</h2>
      <ul className="divide-y rounded-lg border bg-background shadow-sm">
        {items.map((item) => (
          <li key={item.id}>
            <Button
              className="h-auto w-full items-start justify-between gap-3 whitespace-normal px-4 py-3 text-left"
              type="button"
              variant="ghost"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-sm leading-snug">
                  {item.label}
                </span>
                {item.description ? (
                  <span className="mt-0.5 block text-muted-foreground text-xs leading-snug">
                    {item.description}
                  </span>
                ) : null}
              </span>
              <ChevronRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
