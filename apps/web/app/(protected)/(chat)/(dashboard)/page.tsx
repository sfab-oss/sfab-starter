import { AppBreadcrumbs } from "@workspace/ui/components/brand/app-breadcrumbs";
import {
  AppLayoutHeader,
  AppLayoutHeaderActions,
  AppLayoutPage,
  AppLayoutResizablePanelTrigger,
} from "@workspace/ui/components/brand/app-layout";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { InventoryValueChart } from "@/components/dashboard/inventory-value-chart";
import { LowStockAlerts } from "@/components/dashboard/low-stock-alerts";
import { StockStatusChart } from "@/components/dashboard/stock-status-chart";
import { StockTrendsChart } from "@/components/dashboard/stock-trends-chart";

export default function DashboardPage() {
  return (
    <AppLayoutPage>
      <AppLayoutHeader>
        <AppBreadcrumbs items={[{ title: "Dashboard" }]} />
        <AppLayoutHeaderActions>
          <AppLayoutResizablePanelTrigger panelId="chat-panel" />
        </AppLayoutHeaderActions>
      </AppLayoutHeader>

      <div className="@container flex-1 space-y-6 overflow-y-auto p-6">
        <DashboardStats />

        <div className="grid @lg:grid-cols-7 @md:grid-cols-2 gap-6">
          <div className="@lg:col-span-4">
            <StockTrendsChart />
          </div>
          <div className="@lg:col-span-3">
            <StockStatusChart />
          </div>
        </div>

        <div className="grid @lg:grid-cols-7 @md:grid-cols-2 gap-6">
          <div className="@lg:col-span-4">
            <InventoryValueChart />
          </div>
          <div className="@lg:col-span-3">
            <LowStockAlerts />
          </div>
        </div>
      </div>
    </AppLayoutPage>
  );
}
