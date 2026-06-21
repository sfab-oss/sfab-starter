import { AppBreadcrumbs } from "@workspace/ui/components/brand/app-breadcrumbs";
import {
  AppLayout,
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
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/shadcn/card";
import { Activity, Boxes, DollarSign, Plus, TrendingUp } from "lucide-react";
import { GallerySidebar } from "./components/gallery-sidebar";
import { InventoryTable } from "./components/inventory-table";

/**
 * dashboard-01 — the operator app shell.
 *
 * A self-contained, full-page block (mock data, no backend) that composes the
 * starter's real layout primitives: `AppLayout` + `Sidebar`, a header with
 * breadcrumbs, stat cards, the brand `DataTable`, and an activity feed. It is the
 * same shape as `apps/web`'s `_protected` shell, but standalone so it can render
 * chromeless at `/view/dashboard-01` and embed in the docs. The shell + table
 * live in `./components`; this file is the composition.
 */

const STATS = [
  {
    label: "Revenue (30d)",
    value: "$45,231",
    delta: "+20.1%",
    icon: DollarSign,
  },
  { label: "Units sold", value: "12,234", delta: "+19%", icon: TrendingUp },
  { label: "SKUs tracked", value: "1,842", delta: "+86", icon: Boxes },
  { label: "Active now", value: "573", delta: "+201/hr", icon: Activity },
];

const ACTIVITY = [
  {
    who: "Olivia Martin",
    what: "received 320 units into CDMX-01",
    when: "2m ago",
  },
  {
    who: "Jackson Lee",
    what: "flagged SKU-2271 as low stock",
    when: "18m ago",
  },
  { who: "Isabella Nguyen", what: "created warehouse MTY-03", when: "1h ago" },
  {
    who: "William Kim",
    what: "exported the monthly inventory report",
    when: "3h ago",
  },
];

export default function Dashboard01() {
  return (
    <AppLayout sidebar={<GallerySidebar />}>
      <AppLayoutPage>
        <AppLayoutHeader>
          <AppBreadcrumbs items={[{ title: "Home" }, { title: "Dashboard" }]} />
          <AppLayoutHeaderTitle>Dashboard</AppLayoutHeaderTitle>
          <AppLayoutHeaderActions>
            <Button size="sm">
              <Plus className="size-4" />
              New product
            </Button>
          </AppLayoutHeaderActions>
        </AppLayoutHeader>

        <AppLayoutContent>
          <div className="@container flex-1 space-y-6 overflow-y-auto p-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {STATS.map((stat) => (
                <Card key={stat.label}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="font-medium text-sm">
                      {stat.label}
                    </CardTitle>
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="font-bold text-2xl">{stat.value}</div>
                    <p className="text-muted-foreground text-xs">
                      {stat.delta} from last month
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-7">
              <Card className="lg:col-span-5">
                <CardHeader>
                  <CardTitle>Inventory</CardTitle>
                  <CardDescription>
                    Live stock across all warehouses. Filter, sort, and page —
                    all client-side on mock data.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <InventoryTable />
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Recent activity</CardTitle>
                  <CardDescription>Last 24 hours.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-6">
                    {ACTIVITY.map((event) => (
                      <li
                        className="flex gap-3"
                        key={`${event.who}-${event.when}`}
                      >
                        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <Activity className="size-4" />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <p className="text-sm leading-snug">
                            <span className="font-medium">{event.who}</span>{" "}
                            {event.what}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {event.when}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </AppLayoutContent>
      </AppLayoutPage>
    </AppLayout>
  );
}
