"use client";

import type {
  ColumnFiltersState,
  PaginationState,
  SortingState,
  Updater,
} from "@tanstack/react-table";
import { AppBreadcrumbs } from "@workspace/ui/components/brand/app-breadcrumbs";
import { ResourceTable } from "@workspace/ui/components/brand/resource-table";
import {
  Shell,
  ShellContent,
  ShellHeader,
  ShellHeaderActions,
  ShellHeaderSidebarTrigger,
  ShellInset,
  ShellPage,
} from "@workspace/ui/components/brand/shell";
import { Button } from "@workspace/ui/components/shadcn/button";
import { useCallback, useMemo, useState } from "react";
import { AppShellSidebar } from "../../_shared/app-shell-sidebar";
import { RegistryQueryProvider } from "../../_shared/registry-query-provider";
import {
  PEOPLE_COLUMNS,
  PEOPLE_FILTER_DEFINITIONS,
} from "./components/people/people-columns";
import {
  ResourceListEmptyState,
  ResourceListErrorState,
  ResourceListPresetEmptyState,
  ResourceListStaleBanner,
  ResourceListTableSkeleton,
} from "./components/resource-list-collection-state";
import { usePeopleList } from "./hooks/use-people";
import { getPeopleUnfilteredTotal } from "./lib/people/fetch-people";
import type { PeopleListParams } from "./lib/people/types";

const DEFAULT_PAGE_SIZE = 10;

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
    return <ResourceListEmptyState onCreate={() => undefined} />;
  }

  if (isPresetEmpty) {
    return <ResourceListPresetEmptyState onClearFilters={clearFilters} />;
  }

  return undefined;
}

function ResourceListPageContent() {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const listParams = useMemo<PeopleListParams>(
    () => ({
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      sortBy: sorting[0]?.id,
      sortOrder: sorting[0]?.desc ? "desc" : "asc",
      columnFilters,
    }),
    [columnFilters, pagination.pageIndex, pagination.pageSize, sorting]
  );

  const {
    data: peopleResponse,
    error,
    isError,
    isFetching,
    isLoading,
    isPlaceholderData,
    refetch,
  } = usePeopleList(listParams);

  const onPaginationChange = useCallback(
    (updater: Updater<PaginationState>) => {
      setPagination((current) =>
        typeof updater === "function" ? updater(current) : updater
      );
    },
    []
  );

  const onSortingChange = useCallback((updater: Updater<SortingState>) => {
    setSorting((current) =>
      typeof updater === "function" ? updater(current) : updater
    );
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }, []);

  const onColumnFiltersChange = useCallback(
    (updater: Updater<ColumnFiltersState>) => {
      setColumnFilters((current) =>
        typeof updater === "function" ? updater(current) : updater
      );
      setPagination((current) => ({ ...current, pageIndex: 0 }));
    },
    []
  );

  const clearFilters = useCallback(() => {
    setColumnFilters([]);
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }, []);

  const filteredTotal = peopleResponse?.total ?? 0;
  const hasActiveFilters = columnFilters.length > 0;
  const showInitialLoading = isLoading && peopleResponse === undefined;
  const showStale =
    isFetching && isPlaceholderData && peopleResponse !== undefined;
  // With no unfiltered count from the server, filters alone tell the two empties
  // apart: filters + no matches = preset-empty; no filters + no rows = true-empty.
  const isEmptyResult =
    !(showInitialLoading || isError) &&
    peopleResponse !== undefined &&
    filteredTotal === 0;
  const isPresetEmpty = isEmptyResult && hasActiveFilters;
  const isTrueEmpty = isEmptyResult && !hasActiveFilters;

  const collectionEmpty = resolveCollectionEmpty({
    isTrueEmpty,
    isPresetEmpty,
    clearFilters,
  });

  const pageCount = peopleResponse
    ? Math.ceil(peopleResponse.total / listParams.pageSize)
    : 0;

  return (
    <Shell sidebar={<AppShellSidebar activeId="people" />}>
      <ShellInset>
        <ShellPage>
          <ShellHeader>
            <ShellHeaderSidebarTrigger className="-ml-1" />
            <AppBreadcrumbs items={[{ title: "People" }]} />
            <ShellHeaderActions>
              <Button size="sm" type="button">
                New person
              </Button>
            </ShellHeaderActions>
          </ShellHeader>
          <ShellContent>
            {showInitialLoading ? <ResourceListTableSkeleton /> : null}

            {isError ? (
              <ResourceListErrorState
                message={error instanceof Error ? error.message : undefined}
                onRetry={() => {
                  refetch();
                }}
              />
            ) : null}

            {showInitialLoading || isError ? null : (
              <>
                {showStale ? <ResourceListStaleBanner /> : null}
                <ResourceTable
                  className="min-h-0 flex-1"
                  collectionEmpty={collectionEmpty}
                  columnFilters={columnFilters}
                  columns={PEOPLE_COLUMNS}
                  data={peopleResponse?.data ?? []}
                  embedded
                  filterDefinitions={PEOPLE_FILTER_DEFINITIONS}
                  filteredCount={peopleResponse?.total ?? 0}
                  onColumnFiltersChange={onColumnFiltersChange}
                  onPaginationChange={onPaginationChange}
                  onRowClick={() => undefined}
                  onSortingChange={onSortingChange}
                  pageCount={pageCount}
                  pagination={pagination}
                  rowMenuActions={() => [
                    { label: "View profile", onSelect: () => undefined },
                    { label: "Edit", onSelect: () => undefined },
                  ]}
                  sorting={sorting}
                  totalCount={getPeopleUnfilteredTotal()}
                />
              </>
            )}
          </ShellContent>
        </ShellPage>
      </ShellInset>
    </Shell>
  );
}

export default function ResourceListPage() {
  return (
    <RegistryQueryProvider>
      <ResourceListPageContent />
    </RegistryQueryProvider>
  );
}
