import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type {
  ColumnDef,
  PaginationState,
  SortingState,
  Updater,
} from "@tanstack/react-table";
import type { Product } from "@workspace/contract/catalog";
import { paginationQuerySchema } from "@workspace/contract/pagination";
import { AppBreadcrumbs } from "@workspace/ui/components/brand/app-breadcrumbs";
import {
  AppLayoutHeader,
  AppLayoutHeaderActions,
  AppLayoutPage,
} from "@workspace/ui/components/brand/app-layout";
import { DataTable } from "@workspace/ui/components/brand/data-table";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Checkbox } from "@workspace/ui/components/shadcn/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/shadcn/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/shadcn/dropdown-menu";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { CreateProductDialog } from "@/components/catalog/create-product-dialog";
import {
  MovementForm,
  type MovementFormValues,
} from "@/components/catalog/movement-form";
import { useSetPageContext } from "@/components/providers/page-context";
import { useCreateMovement, useProducts } from "@/hooks/use-products";

export const Route = createFileRoute("/_protected/inventory/")({
  component: InventoryPage,
  validateSearch: paginationQuerySchema,
});

function InventoryPage() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data: productsResponse, isLoading } = useProducts(searchParams);
  const createMovement = useCreateMovement();

  useSetPageContext(
    useMemo(
      () => ({
        title: "Products",
        description: "Inventory product catalog",
        entityType: "products",
        entityId: "list",
      }),
      []
    )
  );

  const [activeMovement, setActiveMovement] = useState<{
    product: Product;
    type: "IN" | "OUT";
  } | null>(null);

  // --- Pagination state bridge (1-indexed URL <-> 0-indexed react-table) ---
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

  const pageCount = productsResponse
    ? Math.ceil(productsResponse.total / searchParams.pageSize)
    : 0;

  const handleMovementSubmit = async (data: MovementFormValues) => {
    if (activeMovement) {
      await createMovement.mutateAsync({
        productId: activeMovement.product.id,
        type: data.type,
        quantity: data.quantity,
        toWarehouseId: data.toWarehouseId ?? null,
        fromWarehouseId: data.fromWarehouseId ?? null,
        notes: data.notes || `Manual ${data.type}`,
      });
      setActiveMovement(null);
    }
  };

  const columns: ColumnDef<Product>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          aria-label="Select all"
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label="Select row"
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
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
        const product = row.original;
        return (
          <Link
            className="font-medium transition-colors hover:text-primary hover:underline"
            params={{ id: product.id }}
            to="/inventory/$id"
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
      accessorKey: "totalStock",
      header: ({ column }) => {
        return (
          <Button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            variant="ghost"
          >
            Stock Level
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const stock = row.getValue("totalStock") as number;
        const minStock = row.original.minStockLevel ?? 5;
        const isLow = stock <= minStock;

        return (
          <div className="flex items-center gap-2">
            <span>{stock}</span>
            {isLow && (
              <Badge className="text-xs" variant="destructive">
                Low
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "price",
      header: ({ column }) => {
        return (
          <Button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            variant="ghost"
          >
            Price
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const price = Number.parseFloat(row.getValue("price") || "0");
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(price);

        return <div className="text-right font-medium">{formatted}</div>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const product = row.original;

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
                onClick={() => navigator.clipboard.writeText(product.id)}
              >
                Copy product ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link params={{ id: product.id }} to="/inventory/$id">
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setActiveMovement({ product, type: "IN" })}
              >
                Restock
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setActiveMovement({ product, type: "OUT" })}
              >
                Remove Stock
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
        <AppBreadcrumbs items={[{ title: "Inventory" }]} />
        <AppLayoutHeaderActions>
          <CreateProductDialog />
        </AppLayoutHeaderActions>
      </AppLayoutHeader>

      <div className="p-6">
        {isLoading && !productsResponse ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            Loading inventory...
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

      <Dialog
        onOpenChange={(open) => !open && setActiveMovement(null)}
        open={!!activeMovement}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {activeMovement?.type === "IN" ? "Restock" : "Remove Stock"}{" "}
              {activeMovement?.product?.name}
            </DialogTitle>
            <DialogDescription>
              {activeMovement?.type === "IN"
                ? "Add inventory to a warehouse. This will record an 'IN' movement."
                : "Remove inventory from a warehouse. This will record an 'OUT' movement."}
            </DialogDescription>
          </DialogHeader>
          {activeMovement && (
            <MovementForm
              initialType={activeMovement.type}
              isLoading={createMovement.isPending}
              onCancel={() => setActiveMovement(null)}
              onSubmit={handleMovementSubmit}
            />
          )}
        </DialogContent>
      </Dialog>
    </AppLayoutPage>
  );
}
