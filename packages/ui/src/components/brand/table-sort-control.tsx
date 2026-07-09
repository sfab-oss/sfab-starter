"use client";

import type { SortingState, Table } from "@tanstack/react-table";
import { SortIcon } from "@workspace/ui/components/brand/sortable-header";
import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/shadcn/popover";
import { Separator } from "@workspace/ui/components/shadcn/separator";
import { Check } from "lucide-react";
import { useState } from "react";
export interface SortableColumn {
  id: string;
  label: string;
}
export interface TableSort {
  columns: SortableColumn[];
  onSortingChange: (sorting: SortingState) => void;
  sorting: SortingState;
}

/** Sortable columns from the table instance (`meta.label` on each column def). */
export function getSortableColumns<T>(table: Table<T>): SortableColumn[] {
  return table
    .getAllLeafColumns()
    .filter((column) => column.getCanSort())
    .map((column) => ({
      id: column.id,
      label: column.columnDef.meta?.label ?? column.id,
    }));
}
export function TableSortControl({ sort }: { sort: TableSort }) {
  const { sorting, onSortingChange, columns } = sort;
  const [open, setOpen] = useState(false);
  const active = sorting[0];
  const activeColumn = active
    ? columns.find((column) => column.id === active.id)
    : undefined;
  const activeDirection = active?.desc ? "desc" : "asc";
  const triggerLabel = activeColumn
    ? `Sorted by ${activeColumn.label}, ${activeDirection === "asc" ? "ascending" : "descending"}. Change sort.`
    : "Sort";
  const applySort = (nextSorting: SortingState) => {
    onSortingChange(nextSorting);
    setOpen(false);
  };
  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <Button
            aria-label={triggerLabel}
            className="shrink-0"
            size="icon-xs"
            variant="outline"
          />
        }
      >
        <SortIcon sorted={active ? activeDirection : false} />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="font-medium text-sm">Sort by</p>
          {active ? (
            <Button
              className="h-auto px-0 text-muted-foreground text-xs"
              onClick={() => applySort([])}
              type="button"
              variant="link"
            >
              Clear
            </Button>
          ) : null}
        </div>
        <Separator />
        <div className="max-h-[min(24rem,60vh)] overflow-y-auto p-1">
          {columns.map((column, index) => {
            const isActiveColumn = active?.id === column.id;
            return (
              <div key={column.id}>
                {index > 0 ? <Separator className="my-1" /> : null}
                <p className="px-2 py-1 font-medium text-muted-foreground text-xs">
                  {column.label}
                </p>
                {([false, true] as const).map((desc) => {
                  const isActive = isActiveColumn && active?.desc === desc;
                  return (
                    <Button
                      className="h-8 w-full justify-between px-2 font-normal"
                      key={`${column.id}-${desc ? "desc" : "asc"}`}
                      onClick={() =>
                        applySort(
                          isActive
                            ? []
                            : [
                                {
                                  id: column.id,
                                  desc,
                                },
                              ]
                        )
                      }
                      type="button"
                      variant="ghost"
                    >
                      <span className="flex items-center gap-2">
                        <SortIcon sorted={desc ? "desc" : "asc"} />
                        {desc ? "Descending" : "Ascending"}
                      </span>
                      {isActive ? (
                        <Check className="h-4 w-4 shrink-0" />
                      ) : (
                        <span className="h-4 w-4 shrink-0" />
                      )}
                    </Button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
