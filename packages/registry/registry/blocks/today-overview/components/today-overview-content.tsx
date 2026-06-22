"use client";

import { Skeleton } from "@workspace/ui/components/shadcn/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import { Banknote, ShoppingCart } from "lucide-react";
import { useTodayOverview } from "../hooks/use-today-overview";
import { InventoryMovementsFeed } from "./inventory-movements-feed";
import { PrimaryActionBar } from "./primary-action-bar";
import { type TodayActionItem, TodayActionItems } from "./today-action-items";
import { TodayKpiTile } from "./today-kpi-tile";

const PRE_TC_DISABLED_REASON =
  "Ships with the documents hub and Transaction Core.";

function OverviewSection({
  title,
  description,
  className,
  children,
  ...props
}: React.ComponentProps<"section"> & {
  title: string;
  description?: string;
}) {
  return (
    <section className={cn("space-y-3", className)} {...props}>
      <div className="space-y-0.5">
        <h2 className="font-medium text-sm">{title}</h2>
        {description ? (
          <p className="text-muted-foreground text-xs leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function TodayOverviewContent() {
  const { data, isLoading } = useTodayOverview();

  if (isLoading || !data) {
    return (
      <div
        className="grid gap-6 lg:grid-cols-12"
        data-slot="today-overview-content"
      >
        <Skeleton className="h-32 rounded-xl lg:col-span-12" />
        <Skeleton className="h-28 rounded-lg lg:col-span-7" />
        <div className="grid gap-4 lg:col-span-5">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
        <Skeleton className="h-48 rounded-lg lg:col-span-12" />
      </div>
    );
  }

  const { metrics, movements } = data;

  const actionItems: TodayActionItem[] = [];

  if (metrics.invoicesToCollectCount > 0) {
    actionItems.push({
      id: "collect",
      label: `${metrics.invoicesToCollectCount} invoices to collect`,
      description: "Open Collect to record payments against open balances.",
    });
  }

  if (metrics.lowStockCount > 0) {
    actionItems.push({
      id: "low-stock",
      label: `${metrics.lowStockCount} products below reorder`,
      description: "Review stock levels in Inventory.",
    });
  }

  return (
    <div
      className="grid gap-6 lg:grid-cols-12 lg:gap-x-8 lg:gap-y-6"
      data-slot="today-overview-content"
    >
      <section
        className="rounded-xl border bg-muted/20 p-4 sm:p-5 lg:col-span-12"
        data-slot="today-overview-actions"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-1">
            <h2 className="font-medium text-sm">Quick actions</h2>
            <p className="max-w-2xl text-muted-foreground text-sm leading-snug">
              Hero verbs for the day — sell and collect. Disabled until the
              documents hub ships; everything else on this page uses live or
              honest-empty data.
            </p>
          </div>
          <PrimaryActionBar
            actions={[
              {
                id: "sell",
                label: "New sale",
                icon: <ShoppingCart className="size-4" />,
                disabled: true,
                disabledReason: PRE_TC_DISABLED_REASON,
              },
              {
                id: "collect",
                label: "Collect payment",
                icon: <Banknote className="size-4" />,
                variant: "outline",
                disabled: true,
                disabledReason: PRE_TC_DISABLED_REASON,
              },
            ]}
            className="w-full shrink-0 border-0 bg-transparent p-0 lg:w-auto lg:justify-end"
          />
        </div>
      </section>

      <OverviewSection
        className="lg:col-span-12"
        description="Live inventory signal plus honest placeholders until Transaction Core metrics land."
        title="At a glance"
      >
        <div className="grid gap-4 md:grid-cols-12 lg:items-stretch">
          <TodayKpiTile
            className="md:col-span-12 lg:col-span-7 lg:min-h-36"
            hint="From live inventory thresholds"
            size="featured"
            title="Low stock"
            value={metrics.lowStockCount}
          />
          <div className="grid gap-4 sm:grid-cols-2 md:col-span-12 lg:col-span-5 lg:grid-cols-1 lg:grid-rows-2">
            <TodayKpiTile
              className="lg:min-h-0"
              emptyMessage="AR totals ship with Transaction Core and the Collect hub."
              size="compact"
              title="Outstanding AR"
            />
            <TodayKpiTile
              className="lg:min-h-0"
              emptyMessage="Today's sales summary ships with finalized documents."
              size="compact"
              title="Sales today"
            />
          </div>
        </div>
      </OverviewSection>

      {actionItems.length > 0 ? (
        <div className="lg:col-span-4 lg:row-span-2">
          <TodayActionItems
            className="lg:sticky lg:top-4"
            items={actionItems}
          />
        </div>
      ) : null}

      <div
        className={cn(
          actionItems.length > 0 ? "lg:col-span-8" : "lg:col-span-12"
        )}
      >
        <InventoryMovementsFeed className="min-h-0" movements={movements} />
      </div>
    </div>
  );
}
