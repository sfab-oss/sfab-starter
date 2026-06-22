"use client";

import { cn } from "@workspace/ui/lib/utils";

export interface PropertyGridItem {
  label: string;
  value: React.ReactNode;
  className?: string;
}

export type PropertyGridProps = React.ComponentProps<"dl"> & {
  items: PropertyGridItem[];
  columns?: 1 | 2 | 3;
};

export function PropertyGrid({
  items,
  columns = 2,
  className,
  ...props
}: PropertyGridProps) {
  return (
    <dl
      className={cn(
        "grid gap-4",
        columns === 1 && "grid-cols-1",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        className
      )}
      data-slot="property-grid"
      {...props}
    >
      {items.map((item) => (
        <div className={cn("space-y-1", item.className)} key={item.label}>
          <dt className="text-muted-foreground text-sm">{item.label}</dt>
          <dd className="font-medium text-sm">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
