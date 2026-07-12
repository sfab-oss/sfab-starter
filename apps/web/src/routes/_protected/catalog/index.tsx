import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type {
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
  SortingState,
  Updater,
} from "@tanstack/react-table";
import { paginationQuerySchema } from "@workspace/contract/pagination";
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
import { DEFAULT_CURRENCY, formatMoneyMinor } from "@workspace/ui/lib/money";
import {
  getColumnFilterValue,
  type TableFilterDefinition,
} from "@workspace/ui/lib/table-filter-types";
import { Package } from "lucide-react";
import { useCallback, useMemo } from "react";
import { CreateProductDialog } from "@/components/catalog/create-product-dialog";
import { useSetPageContext } from "@/components/providers/page-context";
import { type Product, useProducts } from "@/hooks/use-products";
import { intlLocale } from "@/lib/locale";
import { pickListPageView } from "@/lib/page-context-view";
import { getUploadUrl } from "@/lib/uploads";
import { m } from "@/paraglide/messages.js";

export const Route = createFileRoute("/_protected/catalog/")({
  component: CatalogPage,
  validateSearch: paginationQuerySchema,
});

function productFilterDefinitions(): TableFilterDefinition[] {
  return [
    {
      id: "search",
      columnId: "search",
      label: m.catalog_filter_search(),
      type: "text",
      placeholder: m.catalog_filter_search_placeholder(),
    },
  ];
}

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
        <p className="font-medium text-sm">{m.catalog_empty_title()}</p>
        <p className="text-muted-foreground text-sm">
          {m.catalog_empty_hint()}
        </p>
      </div>
    );
  }

  if (isPresetEmpty) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <p className="font-medium text-sm">{m.catalog_empty_filtered()}</p>
        <button
          className="text-primary text-sm underline-offset-4 hover:underline"
          onClick={clearFilters}
          type="button"
        >
          {m.catalog_clear_filters()}
        </button>
      </div>
    );
  }
}

function CatalogPage() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data: productsResponse, isLoading } = useProducts(searchParams);

  useSetPageContext(
    useMemo(
      () => ({
        title: "Products",
        description: "Product catalog",
        entityType: "products",
        entityId: "list",
        view: pickListPageView(searchParams),
      }),
      [searchParams]
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

  const pageCount = productsResponse
    ? Math.ceil(productsResponse.total / searchParams.pageSize)
    : 0;

  const hasActiveFilters = Boolean(searchParams.search?.trim());
  const isEmptyResult =
    !(isLoading && !productsResponse) &&
    productsResponse !== undefined &&
    productsResponse.total === 0;
  const collectionEmpty = resolveCollectionEmpty({
    isTrueEmpty: isEmptyResult && !hasActiveFilters,
    isPresetEmpty: isEmptyResult && hasActiveFilters,
    clearFilters,
  });

  const columns: ColumnDef<Product>[] = [
    {
      id: "image",
      meta: { label: "Image" },
      enableSorting: false,
      header: () => <span className="sr-only">Image</span>,
      cell: ({ row }) => {
        const imageUrl = row.original.imageUrl;
        return (
          <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
            {imageUrl ? (
              <img
                alt=""
                className="size-full object-cover"
                height={40}
                src={getUploadUrl(imageUrl)}
                width={40}
              />
            ) : (
              <Package className="size-4 text-muted-foreground" />
            )}
          </div>
        );
      },
    },
    {
      id: "name",
      meta: { label: m.catalog_column_name() },
      accessorKey: "name",
      header: ({ column }) => <SortableHeader column={column} />,
      cell: ({ row }) => {
        const product = row.original;
        return (
          <Link
            className="font-medium transition-colors hover:text-primary hover:underline"
            params={{ id: product.id }}
            to="/catalog/$id"
          >
            {product.name}
          </Link>
        );
      },
    },
    {
      id: "sku",
      meta: { label: m.catalog_column_sku() },
      accessorKey: "sku",
      enableSorting: false,
      header: ({ column }) => <SortableHeader column={column} />,
    },
    {
      id: "price",
      meta: { label: m.catalog_column_price() },
      accessorKey: "price",
      header: ({ column }) => <SortableHeader column={column} />,
      cell: ({ row }) => {
        const price = (row.getValue("price") as number | null) ?? 0;
        return (
          <div className="text-right font-medium">
            {formatMoneyMinor(price, DEFAULT_CURRENCY, {
              locale: intlLocale(),
            })}
          </div>
        );
      },
    },
  ];

  return (
    <ShellPage>
      <ShellHeader>
        <ShellHeaderSidebarTrigger className="-ml-1" />
        <AppBreadcrumbs items={[{ title: m.catalog_title() }]} />
        <ShellHeaderActions>
          <CreateProductDialog />
        </ShellHeaderActions>
      </ShellHeader>

      <ShellContent>
        {isLoading && !productsResponse ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            Loading products...
          </div>
        ) : (
          <ResourceTable
            className="min-h-0 flex-1"
            collectionEmpty={collectionEmpty}
            columnFilters={columnFilters}
            columns={columns}
            data={productsResponse?.data ?? []}
            embedded
            filterDefinitions={productFilterDefinitions()}
            filteredCount={productsResponse?.total ?? 0}
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
