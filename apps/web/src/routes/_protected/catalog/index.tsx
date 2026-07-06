import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type {
  ColumnDef,
  PaginationState,
  SortingState,
  Updater,
} from "@tanstack/react-table";
import { paginationQuerySchema } from "@workspace/contract/pagination";
import { AppBreadcrumbs } from "@workspace/ui/components/brand/app-breadcrumbs";
import { DataTable } from "@workspace/ui/components/brand/data-table";
import {
  ShellHeader,
  ShellHeaderActions,
  ShellHeaderSidebarTrigger,
  ShellPage,
} from "@workspace/ui/components/brand/shell";
import { Button } from "@workspace/ui/components/shadcn/button";
import { DEFAULT_CURRENCY, formatMoneyMinor } from "@workspace/ui/lib/money";
import { ArrowUpDown } from "lucide-react";
import { useCallback, useMemo } from "react";
import { useDebouncedCallback } from "use-debounce";
import { CreateProductDialog } from "@/components/catalog/create-product-dialog";
import { useSetPageContext } from "@/components/providers/page-context";
import { type Product, useProducts } from "@/hooks/use-products";

export const Route = createFileRoute("/_protected/catalog/")({
  component: CatalogPage,
  validateSearch: paginationQuerySchema,
});

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

  const onFilterChange = useDebouncedCallback((value: string) => {
    navigate({
      search: (prev) => ({
        ...prev,
        search: value || undefined,
        page: 1,
      }),
    });
  }, 300);

  const pageCount = productsResponse
    ? Math.ceil(productsResponse.total / searchParams.pageSize)
    : 0;

  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          variant="ghost"
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
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
      accessorKey: "sku",
      header: "SKU",
    },
    {
      accessorKey: "price",
      header: ({ column }) => (
        <Button
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          variant="ghost"
        >
          Price
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const price = (row.getValue("price") as number | null) ?? 0;
        return (
          <div className="text-right font-medium">
            {formatMoneyMinor(price, DEFAULT_CURRENCY)}
          </div>
        );
      },
    },
  ];

  return (
    <ShellPage>
      <ShellHeader>
        <ShellHeaderSidebarTrigger className="-ml-1" />
        <AppBreadcrumbs items={[{ title: "Catalog" }]} />
        <ShellHeaderActions>
          <CreateProductDialog />
        </ShellHeaderActions>
      </ShellHeader>

      <div className="p-6">
        {isLoading && !productsResponse ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            Loading products...
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={productsResponse?.data ?? []}
            filterPlaceholder="Search products..."
            filterValue={searchParams.search ?? ""}
            onFilterChange={onFilterChange}
            onPaginationChange={onPaginationChange}
            onSortingChange={onSortingChange}
            pageCount={pageCount}
            pagination={pagination}
            sorting={sorting}
          />
        )}
      </div>
    </ShellPage>
  );
}
