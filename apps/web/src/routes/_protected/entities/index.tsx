import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type {
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
  SortingState,
  Updater,
} from "@tanstack/react-table";
import { listEntitiesQuerySchema } from "@workspace/contract/transaction";
import { AppBreadcrumbs } from "@workspace/ui/components/brand/app-breadcrumbs";
import { ResourceTable } from "@workspace/ui/components/brand/resource-table";
import {
  ShellContent,
  ShellHeader,
  ShellHeaderActions,
  ShellHeaderSidebarTrigger,
  ShellPage,
} from "@workspace/ui/components/brand/shell";
import { SortableHeader } from "@workspace/ui/components/brand/sortable-header";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import { DEFAULT_CURRENCY, formatMoneyMinor } from "@workspace/ui/lib/money";
import {
  getColumnFilterValue,
  type TableFilterDefinition,
} from "@workspace/ui/lib/table-filter-types";
import { useCallback, useMemo } from "react";
import { CreateEntityDialog } from "@/components/entities/create-entity-dialog";
import { useSetPageContext } from "@/components/providers/page-context";
import { type Entity, useEntities } from "@/hooks/use-entities";

export const Route = createFileRoute("/_protected/entities/")({
  component: EntitiesPage,
  validateSearch: listEntitiesQuerySchema,
});

const ENTITY_FILTER_DEFINITIONS: TableFilterDefinition[] = [
  {
    id: "search",
    columnId: "search",
    label: "Search",
    type: "text",
    placeholder: "Name…",
  },
];

function resolveCollectionEmpty({
  isTrueEmpty,
  isPresetEmpty,
  clearFilters,
}: {
  isTrueEmpty: boolean;
  isPresetEmpty: boolean;
  clearFilters: () => void;
}) {
  if (isTrueEmpty) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <p className="font-medium text-sm">No entities yet</p>
        <p className="text-muted-foreground text-sm">
          Create a customer or supplier to get started.
        </p>
      </div>
    );
  }

  if (isPresetEmpty) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <p className="font-medium text-sm">No entities match these filters</p>
        <button
          className="text-primary text-sm underline-offset-4 hover:underline"
          onClick={clearFilters}
          type="button"
        >
          Clear filters
        </button>
      </div>
    );
  }

  return undefined;
}

function EntitiesPage() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data: entitiesResponse, isLoading } = useEntities(searchParams);

  useSetPageContext(
    useMemo(
      () => ({
        title: "Entities",
        description: "Customers and suppliers",
        entityType: "entities",
        entityId: "list",
      }),
      []
    )
  );

  const pagination = useMemo<PaginationState>(
    () => ({
      pageIndex: searchParams.page - 1,
      pageSize: searchParams.pageSize,
    }),
    [searchParams.page, searchParams.pageSize]
  );

  const onPaginationChange = useCallback(
    (updater: Updater<PaginationState>) => {
      const next =
        typeof updater === "function" ? updater(pagination) : updater;
      navigate({
        search: (prev) => ({
          ...prev,
          page: next.pageIndex + 1,
          pageSize: next.pageSize,
        }),
      });
    },
    [navigate, pagination]
  );

  const sorting = useMemo<SortingState>(
    () =>
      searchParams.sortBy
        ? [
            {
              id: searchParams.sortBy,
              desc: searchParams.sortOrder === "desc",
            },
          ]
        : [],
    [searchParams.sortBy, searchParams.sortOrder]
  );

  const onSortingChange = useCallback(
    (updater: Updater<SortingState>) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      navigate({
        search: (prev) => ({
          ...prev,
          sortBy: next[0]?.id,
          sortOrder: next[0]?.desc ? ("desc" as const) : ("asc" as const),
          page: 1,
        }),
      });
    },
    [navigate, sorting]
  );

  const columnFilters = useMemo<ColumnFiltersState>(
    () =>
      searchParams.search ? [{ id: "search", value: searchParams.search }] : [],
    [searchParams.search]
  );

  const onColumnFiltersChange = useCallback(
    (updater: Updater<ColumnFiltersState>) => {
      const next =
        typeof updater === "function" ? updater(columnFilters) : updater;
      const searchValue = getColumnFilterValue(next, "search");
      navigate({
        search: (prev) => ({
          ...prev,
          search:
            typeof searchValue === "string" && searchValue.trim()
              ? searchValue
              : undefined,
          page: 1,
        }),
      });
    },
    [columnFilters, navigate]
  );

  const clearFilters = useCallback(() => {
    navigate({
      search: (prev) => ({
        ...prev,
        search: undefined,
        page: 1,
      }),
    });
  }, [navigate]);

  const pageCount = entitiesResponse
    ? Math.ceil(entitiesResponse.total / searchParams.pageSize)
    : 0;

  const hasActiveFilters = Boolean(searchParams.search?.trim());
  const isEmptyResult =
    !(isLoading && !entitiesResponse) &&
    entitiesResponse !== undefined &&
    entitiesResponse.total === 0;
  const collectionEmpty = resolveCollectionEmpty({
    isTrueEmpty: isEmptyResult && !hasActiveFilters,
    isPresetEmpty: isEmptyResult && hasActiveFilters,
    clearFilters,
  });

  const columns: ColumnDef<Entity>[] = [
    {
      id: "name",
      meta: { label: "Name" },
      accessorKey: "name",
      header: ({ column }) => <SortableHeader column={column} />,
      cell: ({ row }) => {
        const entity = row.original;
        return (
          <Link
            className="font-medium transition-colors hover:text-primary hover:underline"
            params={{ id: entity.id }}
            to="/entities/$id"
          >
            {entity.name}
          </Link>
        );
      },
    },
    {
      id: "type",
      meta: { label: "Type" },
      accessorKey: "type",
      header: ({ column }) => <SortableHeader column={column} />,
      cell: ({ row }) => (
        <Badge className="capitalize" variant="secondary">
          {String(row.getValue("type")).replace("_", " ")}
        </Badge>
      ),
    },
    {
      id: "balance",
      meta: { label: "Balance" },
      accessorKey: "balance",
      header: ({ column }) => <SortableHeader column={column} />,
      cell: ({ row }) => {
        const balance = (row.getValue("balance") as number | null) ?? 0;
        return (
          <div className="text-right font-medium tabular-nums">
            {formatMoneyMinor(balance, DEFAULT_CURRENCY)}
          </div>
        );
      },
    },
  ];

  return (
    <ShellPage>
      <ShellHeader>
        <ShellHeaderSidebarTrigger className="-ml-1" />
        <AppBreadcrumbs items={[{ title: "Entities" }]} />
        <ShellHeaderActions>
          <CreateEntityDialog />
        </ShellHeaderActions>
      </ShellHeader>

      <ShellContent>
        {isLoading && !entitiesResponse ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            Loading entities...
          </div>
        ) : (
          <ResourceTable
            className="min-h-0 flex-1"
            collectionEmpty={collectionEmpty}
            columnFilters={columnFilters}
            columns={columns}
            data={entitiesResponse?.data ?? []}
            embedded
            filterDefinitions={ENTITY_FILTER_DEFINITIONS}
            filteredCount={entitiesResponse?.total ?? 0}
            onColumnFiltersChange={onColumnFiltersChange}
            onPaginationChange={onPaginationChange}
            onSortingChange={onSortingChange}
            pageCount={pageCount}
            pagination={pagination}
            sorting={sorting}
          />
        )}
      </ShellContent>
    </ShellPage>
  );
}
