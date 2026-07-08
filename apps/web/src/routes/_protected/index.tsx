import { createFileRoute, Link } from "@tanstack/react-router";
import { AppBreadcrumbs } from "@workspace/ui/components/brand/app-breadcrumbs";
import {
  ShellContent,
  ShellHeader,
  ShellHeaderActions,
  ShellHeaderSidebarTrigger,
  ShellPage,
} from "@workspace/ui/components/brand/shell";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/shadcn/card";
import { FileText, Package, Settings } from "lucide-react";

export const Route = createFileRoute("/_protected/")({
  component: TodayPage,
});

/**
 * Neutral landing for the starter. Deliberately ships no fabricated metrics —
 * it points the operator at the real sections instead. Replace this with a
 * data-backed "Today" summary once a downstream app has flows to summarize.
 */
const QUICK_LINKS = [
  {
    to: "/catalog",
    title: "Catalog",
    description: "Manage products and stock.",
    icon: Package,
  },
  {
    to: "/documents",
    title: "Documents",
    description: "Browse and review documents.",
    icon: FileText,
  },
  {
    to: "/settings",
    title: "Settings",
    description: "Manage your organization and members.",
    icon: Settings,
  },
] as const;

function TodayPage() {
  return (
    <ShellPage>
      <ShellHeader>
        <ShellHeaderSidebarTrigger className="-ml-1" />
        <AppBreadcrumbs items={[{ title: "Today" }]} />
        <ShellHeaderActions />
      </ShellHeader>

      <ShellContent>
        <div className="@container flex-1 space-y-6 overflow-y-auto p-6">
          <div className="space-y-1">
            <h2 className="font-semibold text-2xl tracking-tight">Welcome</h2>
            <p className="text-muted-foreground">
              Jump into a section to get started.
            </p>
          </div>

          <div className="grid @2xl:grid-cols-3 @md:grid-cols-2 gap-4">
            {QUICK_LINKS.map(({ to, title, description, icon: Icon }) => (
              <Link className="group" key={to} to={to}>
                <Card className="h-full transition-colors group-hover:border-primary/50">
                  <CardHeader>
                    <Icon className="mb-2 h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base">{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </ShellContent>
    </ShellPage>
  );
}
