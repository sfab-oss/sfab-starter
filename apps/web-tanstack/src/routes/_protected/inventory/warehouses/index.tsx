import { createFileRoute, Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import type { Warehouse } from "@workspace/types/warehouses";
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
import { CreateWarehouseDialog } from "@/components/inventory/create-warehouse-dialog";
import { useWarehouses } from "@/hooks/use-warehouses";

export const Route = createFileRoute("/_protected/inventory/warehouses/")({
  component: WarehousesPage,
});

function WarehousesPage() {
  const { data: warehouses, isLoading } = useWarehouses();

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
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            Loading warehouses...
          </div>
        ) : (
          <DataTable columns={columns} data={warehouses || []} />
        )}
      </div>
    </AppLayoutPage>
  );
}
