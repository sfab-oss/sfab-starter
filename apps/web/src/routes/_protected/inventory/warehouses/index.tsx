import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type {
  ColumnDef,
  PaginationState,
  SortingState,
  Updater,
} from "@tanstack/react-table";
import { paginationQuerySchema } from "@workspace/contract/pagination";
import type { Warehouse } from "@workspace/contract/warehouses";
import { AppBreadcrumbs } from "@workspace/ui/components/brand/app-breadcrumbs";
import {
  AppLayoutHeader,
  AppLayoutHeaderActions,
  AppLayoutPage,
} from "@workspace/ui/components/brand/app-layout";
import { DataTable } from "@workspace/ui/components/brand/data-table";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import { Button } from "@workspace/ui/components/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/shadcn/dropdown-menu";
import { ArrowUpDown, MapPin, MoreHorizontal, Star } from "lucide-react";
import { useCallback, useMemo } from "react";
import { useDebouncedCallback } from "use-debounce";
import { CreateWarehouseDialog } from "@/components/inventory/create-warehouse-dialog";
import { useSetPageContext } from "@/components/providers/page-context";
import { useWarehouses } from "@/hooks/use-warehouses";

export const Route = createFileRoute("/_protected/inventory/warehouses/")({
  component: WarehousesPage,
  validateSearch: paginationQuerySchema,
});

function WarehousesPage() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data: warehousesResponse, isLoading } = useWarehouses(searchParams);

  useSetPageContext(
    useMemo(
      () => ({
        title: "Warehouses",
        description: "Inventory warehouse locations",
        entityType: "warehouses",
        entityId: "list",
      }),
      []
    )
  );

  // --- Pagination state bridge ---
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

  // --- Sorting state bridge ---
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

  // --- Filter state bridge (debounced) ---
  const onFilterChange = useDebouncedCallback((value: string) => {
    navigate({
      search: (prev) => ({
        ...prev,
        search: value || undefined,
        page: 1,
      }),
    });
  }, 300);

  const pageCount = warehousesResponse
    ? Math.ceil(warehousesResponse.total / searchParams.pageSize)
    : 0;

  const columns: ColumnDef<Warehouse>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <Button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            variant="ghost"
          >
            Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const warehouse = row.original;
        return (
          <div className="flex items-center gap-2">
            <Link
              className="font-medium transition-colors hover:text-primary hover:underline"
              params={{ id: warehouse.id }}
              to="/inventory/warehouses/$id"
            >
              {warehouse.name}
            </Link>
            {warehouse.isDefault && (
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "location",
      header: "Location",
      cell: ({ row }) => {
        const location = row.getValue("location") as string;
        return (
          <div className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="text-sm">{location || "N/A"}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "isDefault",
      header: "Status",
      cell: ({ row }) => {
        const isDefault = row.getValue("isDefault") as boolean;
        return isDefault ? (
          <Badge
            className="bg-primary/10 text-primary hover:bg-primary/20"
            variant="secondary"
          >
            Primary
          </Badge>
        ) : (
          <Badge variant="outline">Regular</Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const warehouse = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-8 w-8 p-0" variant="ghost">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(warehouse.id)}
              >
                Copy warehouse ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link
                  params={{ id: warehouse.id }}
                  to="/inventory/warehouses/$id"
                >
                  Edit Details
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <AppLayoutPage>
      <AppLayoutHeader>
        <AppBreadcrumbs
          items={[
            { title: "Inventory", href: "/inventory" },
            { title: "Warehouses" },
          ]}
        />
        <AppLayoutHeaderActions>
          <CreateWarehouseDialog />
        </AppLayoutHeaderActions>
      </AppLayoutHeader>

      <div className="space-y-4 p-6">
        {isLoading && !warehousesResponse ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            Loading warehouses...
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={warehousesResponse?.data ?? []}
            filterPlaceholder="Search warehouses..."
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
    </AppLayoutPage>
  );
}
