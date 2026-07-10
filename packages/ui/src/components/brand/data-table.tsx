"use client";

import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type OnChangeFn,
  type PaginationState,
  type Row,
  type RowSelectionState,
  type SortingState,
  type Table as TanstackTable,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { sortAriaSort } from "@workspace/ui/components/brand/sortable-header";
import { TableFilterToolbar } from "@workspace/ui/components/brand/table-filter-toolbar";
import { getSortableColumns } from "@workspace/ui/components/brand/table-sort-control";
import { Button } from "@workspace/ui/components/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@workspace/ui/components/shadcn/dropdown-menu";
import { Input } from "@workspace/ui/components/shadcn/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/shadcn/table";
import type { TableFilterDefinition } from "@workspace/ui/lib/table-filter-types";
import { arrIncludesExact } from "@workspace/ui/lib/table-filter-types";
import { cn } from "@workspace/ui/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

const FILTER_TOOLBAR_TABLE_GUTTER =
  "[&_tr>*]:px-3 [&_tr>*:first-child]:pl-4 [&_tr>*:last-child]:pr-4";
function DataTableEmptyRow({
  colSpan,
  message,
}: {
  colSpan: number;
  message: string;
}) {
  return (
    <TableRow>
      <TableCell
        className="h-24 text-center text-muted-foreground"
        colSpan={colSpan}
      >
        {message}
      </TableCell>
    </TableRow>
  );
}
function buildTableBodyContent<TData>({
  columnCount,
  isServerSide,
  toolbarFilteredCount,
  hasFilters,
  filteredEmptyMessage,
  emptyMessage,
  dataLength,
  tableRows,
  onRowClick,
}: {
  columnCount: number;
  isServerSide: boolean;
  toolbarFilteredCount: number;
  hasFilters: boolean;
  filteredEmptyMessage: string;
  emptyMessage: string;
  dataLength: number;
  tableRows: Row<TData>[];
  onRowClick?: (row: TData) => void;
}): ReactNode {
  if (isServerSide && toolbarFilteredCount === 0) {
    return (
      <DataTableEmptyRow
        colSpan={columnCount}
        message={hasFilters ? filteredEmptyMessage : emptyMessage}
      />
    );
  }
  if (!isServerSide && dataLength === 0) {
    return <DataTableEmptyRow colSpan={columnCount} message={emptyMessage} />;
  }
  if (tableRows.length === 0) {
    return (
      <DataTableEmptyRow
        colSpan={columnCount}
        message={hasFilters ? filteredEmptyMessage : emptyMessage}
      />
    );
  }
  return tableRows.map((row) => (
    <TableRow
      className={onRowClick ? "cursor-pointer" : undefined}
      data-state={row.getIsSelected() && "selected"}
      key={row.id}
      onClick={onRowClick ? () => onRowClick(row.original) : undefined}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  ));
}
function DataTableLegacyFilterRow<TData>({
  table,
  filterColumn,
  filterPlaceholder,
  filterValue,
  onFilterChange,
  showColumnVisibility,
}: {
  table: TanstackTable<TData>;
  filterColumn: string;
  filterPlaceholder: string;
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  showColumnVisibility: boolean;
}) {
  return (
    <div className="flex items-center py-4">
      {onFilterChange ? (
        <Input
          className="max-w-sm"
          onChange={(event) => onFilterChange(event.target.value)}
          placeholder={filterPlaceholder}
          value={filterValue ?? ""}
        />
      ) : (
        <Input
          className="max-w-sm"
          onChange={(event) =>
            table.getColumn(filterColumn)?.setFilterValue(event.target.value)
          }
          placeholder={filterPlaceholder}
          value={
            (table.getColumn(filterColumn)?.getFilterValue() as string) ?? ""
          }
        />
      )}
      {showColumnVisibility ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button className="ml-auto" variant="outline" />}
          >
            Columns
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  checked={column.getIsVisible()}
                  className="capitalize"
                  key={column.id}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
function DataTablePaginationButtons({
  canPrevious,
  canNext,
  onPrevious,
  onNext,
}: {
  canPrevious: boolean;
  canNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        aria-label="Previous page"
        className="size-7"
        disabled={!canPrevious}
        onClick={onPrevious}
        size="icon"
        type="button"
        variant="outline"
      >
        <ChevronLeftIcon className="size-4" />
      </Button>
      <Button
        aria-label="Next page"
        className="size-7"
        disabled={!canNext}
        onClick={onNext}
        size="icon"
        type="button"
        variant="outline"
      >
        <ChevronRightIcon className="size-4" />
      </Button>
    </div>
  );
}
function DataTableHeaderRows<TData>({
  table,
}: {
  table: TanstackTable<TData>;
}) {
  return (
    <TableHeader>
      {table.getHeaderGroups().map((headerGroup) => (
        <TableRow key={headerGroup.id}>
          {headerGroup.headers.map((header) => {
            const sorted = header.column.getIsSorted();
            return (
              <TableHead
                aria-sort={sortAriaSort(sorted)}
                className={cn(sorted && "bg-muted/40")}
                key={header.id}
              >
                {header.isPlaceholder
                  ? null
                  : flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
              </TableHead>
            );
          })}
        </TableRow>
      ))}
    </TableHeader>
  );
}
function getServerTableOptions({
  pageCount,
  pagination,
  sorting,
  columnFilters,
  columnVisibility,
  rowSelection,
  onPaginationChange,
  onSortingChange,
  onColumnFiltersChange,
}: {
  pageCount?: number;
  pagination?: PaginationState;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  columnVisibility: VisibilityState;
  rowSelection: RowSelectionState;
  onPaginationChange?: OnChangeFn<PaginationState>;
  onSortingChange: OnChangeFn<SortingState>;
  onColumnFiltersChange: OnChangeFn<ColumnFiltersState>;
}) {
  return {
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount,
    state: {
      pagination,
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    onPaginationChange,
    onSortingChange,
    onColumnFiltersChange,
  };
}
function getClientTableOptions({
  sorting,
  columnFilters,
  columnVisibility,
  rowSelection,
  onSortingChange,
  onColumnFiltersChange,
}: {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  columnVisibility: VisibilityState;
  rowSelection: RowSelectionState;
  onSortingChange: OnChangeFn<SortingState>;
  onColumnFiltersChange: OnChangeFn<ColumnFiltersState>;
}) {
  return {
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange,
    onColumnFiltersChange,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  };
}
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pageCount?: number;
  pagination?: PaginationState;
  onPaginationChange?: OnChangeFn<PaginationState>;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;

  /** Legacy single-column search input (catalog tables). */
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  filterPlaceholder?: string;
  filterColumn?: string;

  /** Platform-style filter popover + chips (tasks / resource list). */
  filterDefinitions?: TableFilterDefinition[];
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>;
  showColumnVisibility?: boolean;
  onRowClick?: (row: TData) => void;
  emptyMessage?: string;
  filteredEmptyMessage?: string;
  filteredCount?: number;
  totalCount?: number;
  /** Rich empty UI for server-driven lists — replaces the default table empty row. */
  collectionEmpty?: ReactNode;
}
export function DataTable<TData, TValue>(props: DataTableProps<TData, TValue>) {
  const controller = useDataTableController(props);
  return <DataTableView {...props} {...controller} />;
}
function useDataTableController<TData, TValue>({
  columns,
  data,
  pageCount,
  pagination: externalPagination,
  onPaginationChange,
  sorting: externalSorting,
  onSortingChange,
  onFilterChange,
  filterColumn = "name",
  filterDefinitions,
  columnFilters: externalColumnFilters,
  onColumnFiltersChange,
  onRowClick,
  emptyMessage = "No results.",
  filteredEmptyMessage = "No rows match your filters.",
  filteredCount: filteredCountProp,
  totalCount: totalCountProp,
  collectionEmpty,
}: DataTableProps<TData, TValue>) {
  const isServerSide = externalPagination !== undefined;
  const useFilterToolbar =
    filterDefinitions !== undefined && filterDefinitions.length > 0;
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  const [internalColumnFilters, setInternalColumnFilters] =
    useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const sorting = externalSorting ?? internalSorting;
  const setSorting = onSortingChange ?? setInternalSorting;
  const columnFilters = externalColumnFilters ?? internalColumnFilters;
  const setColumnFilters = onColumnFiltersChange ?? setInternalColumnFilters;
  const table = useReactTable({
    data,
    columns,
    filterFns: {
      arrIncludesExact,
    },
    getCoreRowModel: getCoreRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    ...(isServerSide
      ? getServerTableOptions({
          columnFilters,
          columnVisibility,
          onColumnFiltersChange: setColumnFilters,
          onPaginationChange,
          onSortingChange: setSorting,
          pageCount,
          pagination: externalPagination,
          rowSelection,
          sorting,
        })
      : getClientTableOptions({
          columnFilters,
          columnVisibility,
          onColumnFiltersChange: setColumnFilters,
          onSortingChange: setSorting,
          rowSelection,
          sorting,
        })),
  });
  const filteredRows = table.getFilteredRowModel().rows;
  const tableRows = isServerSide ? table.getRowModel().rows : filteredRows;
  const toolbarFilteredCount = filteredCountProp ?? filteredRows.length;
  const toolbarTotalCount =
    totalCountProp ?? (isServerSide ? toolbarFilteredCount : data.length);
  const hasFilters = useFilterToolbar && columnFilters.length > 0;
  const showLegacyFilterRow =
    !useFilterToolbar && (onFilterChange !== undefined || filterColumn);
  const tableBodyContent = buildTableBodyContent({
    columnCount: columns.length,
    dataLength: data.length,
    emptyMessage,
    filteredEmptyMessage,
    hasFilters,
    isServerSide,
    onRowClick,
    tableRows,
    toolbarFilteredCount,
  });
  const showCollectionEmpty =
    isServerSide && toolbarFilteredCount === 0 && collectionEmpty !== undefined;
  return {
    columnFilters,
    collectionEmpty,
    filteredRows,
    isServerSide,
    setColumnFilters,
    setSorting,
    showCollectionEmpty,
    showLegacyFilterRow,
    sorting,
    table,
    tableBodyContent,
    toolbarFilteredCount,
    toolbarTotalCount,
    useFilterToolbar,
    showClientPagination: !(isServerSide || useFilterToolbar),
  };
}
function DataTableView<TData, TValue>({
  filterColumn = "name",
  filterDefinitions,
  filterPlaceholder = "Filter...",
  filterValue,
  onFilterChange,
  pageCount,
  pagination: externalPagination,
  showColumnVisibility = true,
  columnFilters,
  filteredRows,
  isServerSide,
  setColumnFilters,
  setSorting,
  showLegacyFilterRow,
  sorting,
  table,
  tableBodyContent,
  toolbarFilteredCount,
  toolbarTotalCount,
  useFilterToolbar,
  showClientPagination,
  collectionEmpty,
  showCollectionEmpty,
}: DataTableProps<TData, TValue> &
  ReturnType<typeof useDataTableController<TData, TValue>>) {
  return (
    <div
      className={cn(
        "w-full",
        useFilterToolbar && "flex min-h-0 flex-1 flex-col"
      )}
    >
      {useFilterToolbar ? (
        <div className="shrink-0">
          <TableFilterToolbar
            columnFilters={columnFilters}
            definitions={filterDefinitions ?? []}
            filteredCount={toolbarFilteredCount}
            onColumnFiltersChange={setColumnFilters}
            sort={{
              sorting,
              onSortingChange: setSorting,
              columns: getSortableColumns(table),
            }}
            totalCount={toolbarTotalCount}
          />
        </div>
      ) : null}

      {showLegacyFilterRow ? (
        <DataTableLegacyFilterRow
          filterColumn={filterColumn}
          filterPlaceholder={filterPlaceholder}
          filterValue={filterValue}
          onFilterChange={onFilterChange}
          showColumnVisibility={showColumnVisibility}
          table={table}
        />
      ) : null}

      {showCollectionEmpty ? (
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            useFilterToolbar && FILTER_TOOLBAR_TABLE_GUTTER
          )}
          data-slot="resource-table-collection-empty"
        >
          {collectionEmpty}
        </div>
      ) : (
        <div
          className={cn(
            !useFilterToolbar && "rounded-md border",
            useFilterToolbar &&
              cn("min-h-0 flex-1 overflow-auto", FILTER_TOOLBAR_TABLE_GUTTER)
          )}
        >
          <Table>
            <DataTableHeaderRows table={table} />
            <TableBody>{tableBodyContent}</TableBody>
          </Table>
        </div>
      )}

      {isServerSide && !showCollectionEmpty ? (
        <div className="flex shrink-0 items-center justify-end gap-2 border-t px-4 py-3">
          <div className="flex-1 text-muted-foreground text-sm tabular-nums">
            Page {(externalPagination?.pageIndex ?? 0) + 1} of{" "}
            {Math.max(pageCount ?? 0, 1)}
          </div>
          <DataTablePaginationButtons
            canNext={table.getCanNextPage()}
            canPrevious={table.getCanPreviousPage()}
            onNext={() => table.nextPage()}
            onPrevious={() => table.previousPage()}
          />
        </div>
      ) : null}

      {showClientPagination ? (
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="flex-1 text-muted-foreground text-sm">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {filteredRows.length} row(s) selected.
          </div>
          <DataTablePaginationButtons
            canNext={table.getCanNextPage()}
            canPrevious={table.getCanPreviousPage()}
            onNext={() => table.nextPage()}
            onPrevious={() => table.previousPage()}
          />
        </div>
      ) : null}
    </div>
  );
}
