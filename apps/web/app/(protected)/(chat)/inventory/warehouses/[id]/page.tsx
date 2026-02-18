"use client";

import { AppBreadcrumbs } from "@workspace/ui/components/brand/app-breadcrumbs";
import {
  AppLayoutHeader,
  AppLayoutHeaderActions,
  AppLayoutPage,
  AppLayoutResizablePanelTrigger,
} from "@workspace/ui/components/brand/app-layout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/shadcn/alert-dialog";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/shadcn/card";
import { ArrowLeft, MapPin, Pencil, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  WarehouseForm,
  type WarehouseFormValues,
} from "@/components/inventory/warehouse-form";
import {
  useDeleteWarehouse,
  useUpdateWarehouse,
  useWarehouse,
} from "@/hooks/query/use-warehouses";

export default function WarehouseDetailPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const params = useParams();
  const router = useRouter();
  const warehouseId = params.id as string;

  const { data: warehouse, isLoading: isLoadingWarehouse } =
    useWarehouse(warehouseId);
  const updateWarehouse = useUpdateWarehouse();
  const deleteWarehouse = useDeleteWarehouse();

  const handleUpdate = async (data: WarehouseFormValues) => {
    await updateWarehouse.mutateAsync({
      id: warehouseId,
      data,
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await deleteWarehouse.mutateAsync(warehouseId);
    router.push("/inventory/warehouses");
  };

  if (isLoadingWarehouse) {
    return (
      <AppLayoutPage>
        <div className="flex h-full items-center justify-center">
          <p className="animate-pulse text-muted-foreground">
            Loading warehouse details...
          </p>
        </div>
      </AppLayoutPage>
    );
  }

  if (!warehouse) {
    return (
      <AppLayoutPage>
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <p className="font-medium text-xl">Warehouse not found</p>
          <Button asChild variant="outline">
            <Link href="/inventory/warehouses">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Warehouses
            </Link>
          </Button>
        </div>
      </AppLayoutPage>
    );
  }

  return (
    <AppLayoutPage>
      <AppLayoutHeader>
        <AppBreadcrumbs
          items={[
            { title: "Inventory", href: "/inventory" },
            { title: "Warehouses", href: "/inventory/warehouses" },
            { title: warehouse.name },
          ]}
        />
        <AppLayoutHeaderActions>
          {!isEditing && (
            <>
              <Button
                onClick={() => setIsEditing(true)}
                size="sm"
                variant="outline"
              >
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>
              {!warehouse.isDefault && (
                <Button
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  size="sm"
                  variant="outline"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              )}
            </>
          )}
          <AppLayoutResizablePanelTrigger panelId="chat-panel" />
        </AppLayoutHeaderActions>
      </AppLayoutHeader>

      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button asChild className="-ml-2" size="sm" variant="ghost">
            <Link href="/inventory/warehouses">
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Link>
          </Button>
        </div>

        {isEditing ? (
          <Card className="mx-auto max-w-2xl shadow-md">
            <CardHeader>
              <CardTitle>Edit Warehouse</CardTitle>
              <CardDescription>
                Update the details for <strong>{warehouse.name}</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WarehouseForm
                defaultValues={{
                  name: warehouse.name,
                  location: warehouse.location ?? "",
                  isDefault: warehouse.isDefault,
                }}
                isLoading={updateWarehouse.isPending}
                onCancel={() => setIsEditing(false)}
                onSubmit={handleUpdate}
                submitLabel="Update Warehouse"
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="shadow-sm transition-all hover:shadow-md md:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-2xl">
                        {warehouse.name}
                      </CardTitle>
                      {warehouse.isDefault && (
                        <Badge
                          className="flex items-center gap-1 bg-primary/10 py-0.5 text-primary"
                          variant="secondary"
                        >
                          <Star className="h-3 w-3 fill-primary" /> Primary
                          Warehouse
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />{" "}
                      {warehouse.location || "No location set"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Created At</p>
                      <p className="font-medium">
                        {new Date(warehouse.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Warehouse ID</p>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {warehouse.id}
                      </code>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="h-fit shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Stats</CardTitle>
                <CardDescription>Quick overview of contents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground italic">
                    Product distribution and stock levels coming soon...
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <AlertDialog
        onOpenChange={setIsDeleteDialogOpen}
        open={isDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the warehouse{" "}
              <strong>{warehouse.name}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteWarehouse.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteWarehouse.isPending}
              onClick={handleDelete}
            >
              {deleteWarehouse.isPending ? "Deleting..." : "Delete Warehouse"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayoutPage>
  );
}
