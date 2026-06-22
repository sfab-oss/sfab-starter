"use client";

import type { Column, RowData } from "@tanstack/react-table";
import { Button } from "@workspace/ui/components/shadcn/button";
import { cn } from "@workspace/ui/lib/utils";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

declare module "@tanstack/react-table" {
  // biome-ignore lint/correctness/noUnusedVariables: TanStack requires these type parameter names
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Human-readable column label, shared by SortableHeader and the sort popover. */
    label?: string;
  }
}

export type SortDirection = false | "asc" | "desc";

export function sortAriaLabel(label: string, sorted: SortDirection): string {
  if (sorted === "asc") {
    return `Sorted by ${label}, ascending. Click to sort descending.`;
  }
  if (sorted === "desc") {
    return `Sorted by ${label}, descending. Click to sort ascending.`;
  }
  return `Sort by ${label}`;
}

export function sortAriaSort(
  sorted: SortDirection
): "ascending" | "descending" | undefined {
  if (sorted === "asc") {
    return "ascending";
  }
  if (sorted === "desc") {
    return "descending";
  }
  return undefined;
}

export function SortIcon({
  sorted,
  className,
}: {
  sorted: SortDirection;
  className?: string;
}) {
  if (sorted === "asc") {
    return <ArrowUp className={cn("h-4 w-4", className)} />;
  }
  if (sorted === "desc") {
    return <ArrowDown className={cn("h-4 w-4", className)} />;
  }
  return (
    <ArrowUpDown
      className={cn("h-4 w-4 text-muted-foreground opacity-50", className)}
    />
  );
}

export function SortableHeader<T>({ column }: { column: Column<T, unknown> }) {
  const sorted = column.getIsSorted();
  const label = column.columnDef.meta?.label ?? column.id;

  return (
    <Button
      aria-label={sortAriaLabel(label, sorted)}
      className={cn("h-8 px-0 font-medium", sorted && "text-foreground")}
      onClick={() => column.toggleSorting(sorted === "asc")}
      variant="ghost"
    >
      {label}
      <SortIcon className="ml-2" sorted={sorted} />
    </Button>
  );
}
