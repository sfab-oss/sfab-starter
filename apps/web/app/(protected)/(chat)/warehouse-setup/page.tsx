"use client";

import { warehouseFormSchema } from "@workspace/types/warehouses";
import { AppBreadcrumbs } from "@workspace/ui/components/brand/app-breadcrumbs";
import {
  AppLayoutHeader,
  AppLayoutHeaderActions,
  AppLayoutPage,
  AppLayoutResizablePanelTrigger,
} from "@workspace/ui/components/brand/app-layout";
import { Button } from "@workspace/ui/components/shadcn/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useChatPageConfig } from "@/components/chat/chat-page-config";
import {
  WarehouseForm,
  type WarehouseFormValues,
} from "@/components/inventory/warehouse-form";
import { useCreateWarehouse } from "@/hooks/query/use-warehouses";
import { useAIForm } from "@/hooks/use-ai-form";

export default function WarehouseSetupPage() {
  const router = useRouter();
  const createWarehouse = useCreateWarehouse();

  // Configure AI chat for this page - memoize to prevent infinite loop
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

  // Create form with AI integration - tool handlers are automatically registered
  const form = useAIForm<WarehouseFormValues>({
    defaultValues: {
      name: "",
      location: "",
      isDefault: false,
    },
    validators: {
      onSubmit: warehouseFormSchema,
      onChange: warehouseFormSchema,
    },
    onSubmit: async ({ value }) => {
      await createWarehouse.mutateAsync(value as WarehouseFormValues);
      router.push("/inventory/warehouses");
    },
  });

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
            <Link href="/inventory/warehouses">
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
            Set up a new storage location for your inventory. The AI assistant
            can help you fill out this form.
          </p>
        </div>

        <div className="max-w-2xl">
          <WarehouseForm
            form={form}
            isLoading={createWarehouse.isPending}
            submitLabel="Create Warehouse"
          />
        </div>
      </div>
    </AppLayoutPage>
  );
}
