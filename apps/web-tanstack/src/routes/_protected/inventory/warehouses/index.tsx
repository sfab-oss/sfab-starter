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
import { getWarehouses } from "@/hooks/use-warehouses";

export const Route = createFileRoute("/_protected/inventory/warehouses/")({
  component: WarehousesPage,
});

function WarehousesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["warehouses"],
    queryFn: getWarehouses,
  });

  return (
    <AppLayoutPage>
      <AppLayoutHeader>
        <AppBreadcrumbs
          items={[
            { title: "Inventory", href: "/inventory" },
            { title: "Warehouses" },
          ]}
        />
        <AppLayoutHeaderTitle>Warehouses</AppLayoutHeaderTitle>
        <AppLayoutHeaderActions>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Warehouse
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
              {data?.warehouses.map((warehouse) => (
                <Card key={warehouse.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{warehouse.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Location:</span>
                        <span className="font-medium">
                          {warehouse.location}
                        </span>
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
