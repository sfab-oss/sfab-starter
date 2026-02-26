import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AppBreadcrumbs } from "@workspace/ui/components/brand/app-breadcrumbs";
import {
  AppLayoutContent,
  AppLayoutHeader,
  AppLayoutHeaderActions,
  AppLayoutHeaderTitle,
  AppLayoutPage,
} from "@workspace/ui/components/brand/app-layout";
import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/shadcn/card";
import { Plus } from "lucide-react";
import { getProducts } from "@/hooks/use-products";

export const Route = createFileRoute("/_protected/inventory/")({
  component: InventoryPage,
});

function InventoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  return (
    <AppLayoutPage>
      <AppLayoutHeader>
        <AppBreadcrumbs items={[{ title: "Inventory" }]} />
        <AppLayoutHeaderTitle>Inventory</AppLayoutHeaderTitle>
        <AppLayoutHeaderActions>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </AppLayoutHeaderActions>
      </AppLayoutHeader>

      <AppLayoutContent>
        <div className="@container flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data?.products.map((product) => (
                <Card key={product.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">SKU:</span>
                        <span className="font-medium">{product.sku}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Price:</span>
                        <span className="font-medium">${product.price}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cost:</span>
                        <span className="font-medium">${product.cost}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </AppLayoutContent>
    </AppLayoutPage>
  );
}
