"use client";

import type {
  ColumnDef,
  ColumnFiltersState,
  OnChangeFn,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";
import { DataTable } from "@workspace/ui/components/brand/data-table";
import { Button } from "@workspace/ui/components/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/shadcn/dropdown-menu";
import type { TableFilterDefinition } from "@workspace/ui/lib/table-filter-types";
import { cn } from "@workspace/ui/lib/utils";
import { MoreHorizontal } from "lucide-react";

export interface ResourceTableRowAction<TData> {
  label: string;
  onSelect: (row: TData) => void;
  disabled?: boolean;
  disabledReason?: string;
}

export interface ResourceTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pageCount?: number;
  pagination?: PaginationState;
  onPaginationChange?: OnChangeFn<PaginationState>;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  filterDefinitions?: TableFilterDefinition[];
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>;
  /** Legacy single search field — omit when using `filterDefinitions`. */
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  filterPlaceholder?: string;
  filterColumn?: string;
  rowPrimaryAction?: (row: TData) => ResourceTableRowAction<TData> | null;
  rowMenuActions?: (row: TData) => ResourceTableRowAction<TData>[];
  onRowClick?: (row: TData) => void;
  filteredCount?: number;
  totalCount?: number;
  /** Inside `ShellContent` / app inset — no outer border on the table chrome. */
  embedded?: boolean;
  className?: string;
}

export function ResourceTable<TData, TValue>({
  columns,
  data,
  pageCount,
  pagination,
  onPaginationChange,
  sorting,
  onSortingChange,
  filterDefinitions,
  columnFilters,
  onColumnFiltersChange,
  filterValue,
  onFilterChange,
  filterPlaceholder,
  filterColumn,
  rowPrimaryAction,
  rowMenuActions,
  onRowClick,
  filteredCount,
  totalCount,
  embedded = false,
  className,
}: ResourceTableProps<TData, TValue>) {
  const hasActions = rowPrimaryAction || rowMenuActions;

  const actionColumn: ColumnDef<TData, TValue> = {
    id: "actions",
    enableSorting: false,
    enableHiding: false,
    header: () => null,
    cell: ({ row }) => {
      const primary = rowPrimaryAction?.(row.original) ?? null;
      const menu = rowMenuActions?.(row.original) ?? [];

      if (!primary && menu.length === 0) {
        return null;
      }

      return (
        <div className="flex items-center justify-end gap-1">
          {primary ? (
            <Button
              disabled={primary.disabled}
              onClick={() => primary.onSelect(row.original)}
              size="sm"
              title={primary.disabled ? primary.disabledReason : undefined}
              type="button"
              variant="outline"
            >
              {primary.label}
            </Button>
          ) : null}
          {menu.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="size-8 p-0" type="button" variant="ghost">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {menu.map((action) => (
                  <DropdownMenuItem
                    disabled={action.disabled}
                    key={action.label}
                    onSelect={() => action.onSelect(row.original)}
                    title={action.disabled ? action.disabledReason : undefined}
                  >
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      );
    },
  };

  const allColumns = hasActions ? [...columns, actionColumn] : columns;

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        !embedded && "rounded-md border",
        className
      )}
      data-slot="resource-table"
    >
      <DataTable
        columnFilters={columnFilters}
        columns={allColumns}
        data={data}
        filterColumn={filterColumn}
        filterDefinitions={filterDefinitions}
        filteredCount={filteredCount}
        filterPlaceholder={filterPlaceholder}
        filterValue={filterValue}
        onColumnFiltersChange={onColumnFiltersChange}
        onFilterChange={onFilterChange}
        onPaginationChange={onPaginationChange}
        onRowClick={onRowClick}
        onSortingChange={onSortingChange}
        pageCount={pageCount}
        pagination={pagination}
        showColumnVisibility={false}
        sorting={sorting}
        totalCount={totalCount}
      />
    </div>
  );
}
