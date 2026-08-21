"use client";

import type {
  ColumnFiltersState,
  OnChangeFn,
  PaginationState,
  RowData,
  SortingState,
} from "@tanstack/react-table";
import { DataTable } from "@workspace/ui/components/brand/data-table";
import type { TableFilterToolbarLabels } from "@workspace/ui/components/brand/table-filter-toolbar";
import { Button } from "@workspace/ui/components/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/shadcn/dropdown-menu";
import type { DataTableColumnDef } from "@workspace/ui/lib/data-table-features";
import type { TableFilterDefinition } from "@workspace/ui/lib/table-filter-types";
import { cn } from "@workspace/ui/lib/utils";
import { MoreHorizontal } from "lucide-react";
export interface ResourceTableRowAction<TData extends RowData> {
  label: string;
  onSelect: (row: TData) => void;
  disabled?: boolean;
  disabledReason?: string;
}
export interface ResourceTableProps<TData extends RowData> {
  columns: DataTableColumnDef<TData>[];
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
  /** Rich empty UI — keeps the filter toolbar visible on server-driven lists. */
  collectionEmpty?: React.ReactNode;
  toolbarLabels?: TableFilterToolbarLabels;
}
export function ResourceTable<TData extends RowData>({
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
  collectionEmpty,
  toolbarLabels,
}: ResourceTableProps<TData>) {
  const hasActions = rowPrimaryAction || rowMenuActions;
  const actionColumn: DataTableColumnDef<TData> = {
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
              <DropdownMenuTrigger
                render={
                  <Button
                    className="size-8 p-0"
                    type="button"
                    variant="ghost"
                  />
                }
              >
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="size-4" />
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
        "flex min-h-0 flex-col",
        !embedded && "rounded-md border",
        className
      )}
      data-slot="resource-table"
    >
      <DataTable
        collectionEmpty={collectionEmpty}
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
        toolbarLabels={toolbarLabels}
        totalCount={totalCount}
      />
    </div>
  );
}
