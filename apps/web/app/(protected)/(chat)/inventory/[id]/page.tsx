"use client";

import type { Movement } from "@workspace/types/products";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/shadcn/dialog";
import { Separator } from "@workspace/ui/components/shadcn/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/shadcn/table";
import { format } from "date-fns";
import {
  Box,
  DollarSign,
  History,
  Minus,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  MovementForm,
  type MovementFormValues,
} from "@/components/inventory/movement-form";
import {
  ProductForm,
  type ProductFormValues,
} from "@/components/inventory/product-form";
import {
  useCreateMovement,
  useDeleteProduct,
  useProduct,
  useProductMovements,
  useUpdateProduct,
} from "@/hooks/query/use-products";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Ok
export default function ProductPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [activeMovementType, setActiveMovementType] = useState<
    "IN" | "OUT" | null
  >(null);

  const params = useParams();
  const productId = params.id as string;
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // All hooks must be called at the top level
  const { data: product, isLoading: isLoadingProduct } = useProduct(
    productId || ""
  );
  const { data: movements, isLoading: isLoadingMovements } =
    useProductMovements(productId || "");
  const updateProduct = useUpdateProduct();
  const createMovement = useCreateMovement();
  const deleteProduct = useDeleteProduct();

  // Don't render anything if we don't have a productId yet
  if (!productId) {
    return (
      <AppLayoutPage>
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <h2 className="font-semibold text-xl">Loading...</h2>
        </div>
      </AppLayoutPage>
    );
  }

  const handleUpdate = async (data: ProductFormValues) => {
    await updateProduct.mutateAsync({
      id: productId,
      data,
    });
    setIsEditing(false);
  };

  const handleMovement = async (data: MovementFormValues) => {
    await createMovement.mutateAsync({
      productId,
      type: data.type,
      quantity: data.quantity,
      toWarehouseId: data.toWarehouseId ?? null,
      fromWarehouseId: data.fromWarehouseId ?? null,
      notes: data.notes || `Manual ${data.type} via Details`,
    });
    setActiveMovementType(null);
  };

  const handleDelete = async () => {
    await deleteProduct.mutateAsync(productId);
    router.push("/inventory");
  };

  if (isLoadingProduct) {
    return (
      <AppLayoutPage>
        <AppLayoutHeader>
          <div className="flex items-center gap-2">
            <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          </div>
        </AppLayoutHeader>
        <div className="p-6">
          <div className="h-64 animate-pulse rounded-lg bg-muted/20" />
        </div>
      </AppLayoutPage>
    );
  }

  if (!product) {
    return (
      <AppLayoutPage>
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <h2 className="font-semibold text-xl">Product not found</h2>
          <Button asChild>
            <Link href="/inventory">Back to Inventory</Link>
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
            { title: product.name },
          ]}
        />
        <AppLayoutHeaderActions>
          {isEditing ? (
            <Button
              onClick={() => setIsEditing(false)}
              size="sm"
              variant="ghost"
            >
              <X className="mr-2 h-4 w-4" /> Cancel
            </Button>
          ) : (
            <>
              <Button
                onClick={() => setIsEditing(true)}
                size="sm"
                variant="outline"
              >
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>
              <Button
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
                size="sm"
                variant="outline"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
              <Button
                onClick={() => setActiveMovementType("OUT")}
                size="sm"
                variant="outline"
              >
                <Minus className="mr-2 h-4 w-4" /> Remove
              </Button>
              <Button onClick={() => setActiveMovementType("IN")} size="sm">
                <Plus className="mr-2 h-4 w-4" /> Restock
              </Button>
            </>
          )}
          <AppLayoutResizablePanelTrigger panelId="chat-panel" />
        </AppLayoutHeaderActions>
      </AppLayoutHeader>

      <div className="space-y-8 overflow-y-auto p-6">
        {/* Top Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">Total Stock</CardTitle>
              <Box className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">{product.totalStock}</div>
              <p className="text-muted-foreground text-xs">
                {product.totalStock <= (product.minStockLevel ?? 5) ? (
                  <span className="font-medium text-red-500">
                    Low Stock Warning
                  </span>
                ) : (
                  "Healthy Level"
                )}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">Price</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">
                ${Number.parseFloat(product.price || "0").toFixed(2)}
              </div>
              <p className="text-muted-foreground text-xs">Per unit</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">
                Inventory Value
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">
                $
                {(
                  product.totalStock * Number.parseFloat(product.price || "0")
                ).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className="text-muted-foreground text-xs">Total asset value</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {/* Main Detail / Edit Area */}
          <div className="space-y-6 md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Product Details</CardTitle>
                <CardDescription>
                  Basic information and settings.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <ProductForm
                    defaultValues={{
                      name: product.name,
                      sku: product.sku,
                      price: product.price
                        ? Number.parseFloat(product.price)
                        : 0,
                      description: product.description || "",
                      minStockLevel: product.minStockLevel || 5,
                    }}
                    isLoading={updateProduct.isPending}
                    onSubmit={handleUpdate}
                    submitLabel="Save Changes"
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-muted-foreground text-sm">
                          SKU
                        </h4>
                        <p className="font-mono text-sm">{product.sku}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-muted-foreground text-sm">
                          Min. Stock Level
                        </h4>
                        <p className="text-sm">{product.minStockLevel}</p>
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="mb-1 font-medium text-muted-foreground text-sm">
                        Description
                      </h4>
                      <p className="text-foreground/90 text-sm leading-relaxed">
                        {product.description || "No description provided."}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* History Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Movement History</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingMovements ? (
                  <div className="py-4 text-center text-muted-foreground text-sm">
                    Loading history...
                  </div>
                  // biome-ignore lint/style/noNestedTernary: Ok
                ) : !movements || movements.length === 0 ? (
                  <div className="rounded-lg border border-dashed py-8 text-center text-muted-foreground text-sm">
                    No movements recorded.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="hidden sm:table-cell">
                          Notes
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements?.map((movement: Movement) => (
                        <TableRow key={movement.id}>
                          <TableCell className="whitespace-nowrap">
                            {format(
                              new Date(movement.createdAt),
                              "MMM d, yyyy"
                            )}
                            <div className="text-muted-foreground text-xs">
                              {format(new Date(movement.createdAt), "h:mm a")}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                movement.type === "IN"
                                  ? "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400"
                                  : // biome-ignore lint/style/noNestedTernary: Ok
                                    movement.type === "OUT"
                                    ? "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400"
                                    : "bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
                              }
                              variant="secondary"
                            >
                              {movement.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium font-mono">
                            {movement.type === "OUT" ? "-" : "+"}
                            {movement.quantity}
                          </TableCell>
                          <TableCell className="hidden max-w-[200px] truncate text-muted-foreground text-xs sm:table-cell">
                            {movement.notes || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar / Meta Info */}
          <div className="space-y-6">
            <Card className="bg-muted/30">
              <CardHeader>
                <CardTitle className="text-sm">Metadata</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{format(new Date(product.createdAt), "PPP")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span>{format(new Date(product.updatedAt), "PPP")}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Product ID</span>
                  <code className="rounded border bg-background px-1 py-0.5">
                    {product.id.slice(0, 8)}...
                  </code>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Movement Dialog - Triggered from Header */}
      <Dialog
        onOpenChange={(open) => !open && setActiveMovementType(null)}
        open={!!activeMovementType}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {activeMovementType === "IN" ? "Restock Product" : "Remove Stock"}
            </DialogTitle>
            <DialogDescription>
              {activeMovementType === "IN"
                ? `Add stock to ${product.name}.`
                : `Remove stock from ${product.name}.`}
            </DialogDescription>
          </DialogHeader>
          {activeMovementType && (
            <MovementForm
              initialType={activeMovementType}
              isLoading={createMovement.isPending}
              onCancel={() => setActiveMovementType(null)}
              onSubmit={handleMovement}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        onOpenChange={setIsDeleteDialogOpen}
        open={isDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the product{" "}
              <strong>{product.name}</strong> and all its movement history. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteProduct.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteProduct.isPending}
              onClick={handleDelete}
            >
              {deleteProduct.isPending ? "Deleting..." : "Delete Product"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayoutPage>
  );
}
