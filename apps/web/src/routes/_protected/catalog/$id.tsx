import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppBreadcrumbs } from "@workspace/ui/components/brand/app-breadcrumbs";
import {
  ShellHeader,
  ShellHeaderActions,
  ShellPage,
} from "@workspace/ui/components/brand/shell";
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
import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/shadcn/card";
import { Separator } from "@workspace/ui/components/shadcn/separator";
import {
  DEFAULT_CURRENCY,
  formatMoneyMinor,
  majorToMinor,
  minorToMajorInput,
} from "@workspace/ui/lib/money";
import { DollarSign, Pencil, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  ProductForm,
  type ProductFormValues,
} from "@/components/catalog/product-form";
import { ShellHeaderSidebarTrigger } from "@/components/layout/shell-header-sidebar-trigger";
import { useSetPageContext } from "@/components/providers/page-context";
import {
  useDeleteProduct,
  useProduct,
  useUpdateProduct,
} from "@/hooks/use-products";
import { intlLocale } from "@/lib/locale";
import { getUploadUrl } from "@/lib/uploads";
import { m } from "@/paraglide/messages.js";
export const Route = createFileRoute("/_protected/catalog/$id")({
  component: ProductPage,
});
interface ProductDetailsReadOnlyProps {
  product: {
    name: string;
    sku: string;
    description: string | null;
    imageUrl: string | null;
  };
}
function ProductDetailsReadOnly({ product }: ProductDetailsReadOnlyProps) {
  return (
    <div className="space-y-4">
      {product.imageUrl && (
        <>
          <div className="overflow-hidden rounded-lg border">
            <img
              alt={product.name}
              className="h-48 w-full object-cover"
              height={192}
              src={getUploadUrl(product.imageUrl)}
              width={384}
            />
          </div>
          <Separator />
        </>
      )}
      <div>
        <h4 className="mb-1 font-medium text-muted-foreground text-sm">
          {m.common_description()}
        </h4>
        <p className="text-foreground/90 text-sm leading-relaxed">
          {product.description || m.catalog_no_description()}
        </p>
      </div>
    </div>
  );
}
function ProductPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { id: productId } = Route.useParams();
  const navigate = useNavigate();
  const { data: product, isLoading: isLoadingProduct } = useProduct(
    productId || ""
  );
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  useSetPageContext(
    useMemo(
      () =>
        product
          ? {
              title: product.name,
              description: product.sku,
              entityType: "product",
              entityId: product.id,
              data: {
                sku: product.sku,
              },
            }
          : {
              title: m.catalog_product_singular(),
              entityType: "product",
              entityId: productId,
            },
      [product, productId]
    )
  );
  if (!productId) {
    return (
      <ShellPage>
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <h2 className="font-semibold text-xl">{m.common_loading()}</h2>
        </div>
      </ShellPage>
    );
  }
  const handleUpdate = async (data: ProductFormValues) => {
    await updateProduct.mutateAsync({
      id: productId,
      data: {
        ...data,
        price: majorToMinor(data.price, DEFAULT_CURRENCY),
      },
    });
    setIsEditing(false);
  };
  const handleDelete = async () => {
    await deleteProduct.mutateAsync(productId);
    navigate({
      to: "/catalog",
    });
  };
  if (isLoadingProduct) {
    return (
      <ShellPage>
        <ShellHeader>
          <ShellHeaderSidebarTrigger className="-ml-1" />
          <div className="flex items-center gap-2">
            <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          </div>
        </ShellHeader>
        <div className="p-6">
          <div className="h-64 animate-pulse rounded-lg bg-muted/20" />
        </div>
      </ShellPage>
    );
  }
  if (!product) {
    return (
      <ShellPage>
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <h2 className="font-semibold text-xl">{m.catalog_not_found()}</h2>
          <Button render={<Link to="/catalog" />}>{m.catalog_back()}</Button>
        </div>
      </ShellPage>
    );
  }
  return (
    <ShellPage>
      <ShellHeader>
        <ShellHeaderSidebarTrigger className="-ml-1" />
        <AppBreadcrumbs
          ellipsisAriaLabel={m.breadcrumb_ellipsis_aria()}
          homeLabel={m.nav_home()}
          items={[
            {
              title: m.catalog_title(),
              href: "/catalog",
            },
            {
              title: product.name,
            },
          ]}
        />
        <ShellHeaderActions>
          {isEditing ? (
            <Button
              aria-label={m.common_cancel()}
              onClick={() => setIsEditing(false)}
              size="sm"
              variant="ghost"
            >
              <X className="size-4" />
              <span className="hidden sm:inline">{m.common_cancel()}</span>
            </Button>
          ) : (
            <>
              <Button
                aria-label={m.common_edit()}
                onClick={() => setIsEditing(true)}
                size="sm"
                variant="outline"
              >
                <Pencil className="size-4" />
                <span className="hidden sm:inline">{m.common_edit()}</span>
              </Button>
              <Button
                aria-label={m.common_delete()}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
                size="sm"
                variant="outline"
              >
                <Trash2 className="size-4" />
                <span className="hidden sm:inline">{m.common_delete()}</span>
              </Button>
            </>
          )}
        </ShellHeaderActions>
      </ShellHeader>

      <div className="space-y-8 overflow-y-auto p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">
                {m.catalog_column_price()}
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">
                {formatMoneyMinor(product.price ?? 0, DEFAULT_CURRENCY, {
                  locale: intlLocale(),
                })}
              </div>
              <p className="text-muted-foreground text-xs">
                {m.catalog_per_unit()}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{m.catalog_details()}</CardTitle>
            <CardDescription>{m.catalog_details_description()}</CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <ProductForm
                // Remount when server product fields change (e.g. agent tool
                // invalidation) so RHF defaultValues pick up the fresh query.
                key={[
                  product.id,
                  product.name,
                  product.sku,
                  product.price,
                  product.description ?? "",
                  product.minStockLevel,
                  product.imageUrl ?? "",
                ].join("|")}
                defaultValues={{
                  name: product.name,
                  sku: product.sku,
                  price: minorToMajorInput(
                    product.price ?? 0,
                    DEFAULT_CURRENCY
                  ),
                  description: product.description || "",
                  minStockLevel: product.minStockLevel || 5,
                  imageUrl: product.imageUrl || null,
                }}
                isLoading={updateProduct.isPending}
                mode="edit"
                onSubmit={handleUpdate}
              />
            ) : (
              <ProductDetailsReadOnly product={product} />
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        onOpenChange={setIsDeleteDialogOpen}
        open={isDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {m.common_confirm_delete_title()}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {m.catalog_delete_description({ name: product.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteProduct.isPending}>
              {m.common_cancel()}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteProduct.isPending}
              onClick={handleDelete}
            >
              {deleteProduct.isPending
                ? m.common_deleting()
                : m.catalog_delete_product()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ShellPage>
  );
}
