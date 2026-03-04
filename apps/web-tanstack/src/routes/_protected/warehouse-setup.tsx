import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppBreadcrumbs } from "@workspace/ui/components/brand/app-breadcrumbs";
import {
  AppLayoutHeader,
  AppLayoutHeaderActions,
  AppLayoutPage,
  AppLayoutResizablePanelTrigger,
} from "@workspace/ui/components/brand/app-layout";
import { Button } from "@workspace/ui/components/shadcn/button";
import { ArrowLeft } from "lucide-react";
import { useMemo } from "react";
import { useChatPageConfig } from "@/components/chat/chat-page-config";
import {
  WarehouseForm,
  type WarehouseFormValues,
} from "@/components/inventory/warehouse-form";
import { useCreateWarehouse } from "@/hooks/use-warehouses";

export const Route = createFileRoute("/_protected/warehouse-setup")({
  component: WarehouseSetupPage,
});

function WarehouseSetupPage() {
  const navigate = useNavigate();
  const createWarehouse = useCreateWarehouse();

  const pageConfig = useMemo(
    () => ({
      title: "Warehouse Setup",
      description: "Create a new warehouse for inventory management",
      entityType: "warehouse-setup",
      entityId: "new",
      data: {
        action: "create-warehouse",
      },
    }),
    []
  );

  useChatPageConfig(pageConfig);

  return (
    <AppLayoutPage>
      <AppLayoutHeader>
        <AppBreadcrumbs
          items={[
            { title: "Inventory", href: "/inventory" },
            { title: "Warehouses", href: "/inventory/warehouses" },
            { title: "Setup" },
          ]}
        />
        <AppLayoutHeaderActions>
          <Button asChild size="sm" variant="outline">
            <Link to="/inventory/warehouses">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Warehouses
            </Link>
          </Button>
          <AppLayoutResizablePanelTrigger panelId="chat-panel" />
        </AppLayoutHeaderActions>
      </AppLayoutHeader>

      <div className="space-y-6 p-6">
        <div>
          <h1 className="font-bold text-2xl">Create New Warehouse</h1>
          <p className="text-muted-foreground">
            Set up a new storage location for your inventory.
          </p>
        </div>

        <div className="max-w-2xl">
          <WarehouseForm
            isLoading={createWarehouse.isPending}
            onSubmit={async (data: WarehouseFormValues) => {
              await createWarehouse.mutateAsync(data);
              navigate({ to: "/inventory/warehouses" });
            }}
            submitLabel="Create Warehouse"
          />
        </div>
      </div>
    </AppLayoutPage>
  );
}
