import { createFileRoute, Link } from "@tanstack/react-router";
import { AppBreadcrumbs } from "@workspace/ui/components/brand/app-breadcrumbs";
import {
  ShellContent,
  ShellHeader,
  ShellHeaderActions,
  ShellPage,
} from "@workspace/ui/components/brand/shell";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/shadcn/card";
import { FileText, Package, Phone, Settings, Users } from "lucide-react";
import { ShellHeaderSidebarTrigger } from "@/components/layout/shell-header-sidebar-trigger";
import { m } from "@/paraglide/messages.js";

export const Route = createFileRoute("/_protected/")({
  component: TodayPage,
});

/**
 * Neutral landing for the starter. Deliberately ships no fabricated metrics —
 * it points the operator at the real sections instead. Replace this with a
 * data-backed "Today" summary once a downstream app has flows to summarize.
 */
function TodayPage() {
  const quickLinks = [
    {
      to: "/voice" as const,
      title: m.voice_title(),
      description: m.home_link_voice_desc(),
      icon: Phone,
    },
    {
      to: "/catalog" as const,
      title: m.catalog_title(),
      description: m.home_link_catalog_desc(),
      icon: Package,
    },
    {
      to: "/entities" as const,
      title: m.entities_title(),
      description: m.home_link_entities_desc(),
      icon: Users,
    },
    {
      to: "/documents" as const,
      title: m.documents_title(),
      description: m.home_link_documents_desc(),
      icon: FileText,
    },
    {
      to: "/settings" as const,
      title: m.settings_title(),
      description: m.home_link_settings_desc(),
      icon: Settings,
    },
  ];

  return (
    <ShellPage>
      <ShellHeader>
        <ShellHeaderSidebarTrigger className="-ml-1" />
        <AppBreadcrumbs
          ellipsisAriaLabel={m.breadcrumb_ellipsis_aria()}
          items={[{ title: m.home_title() }]}
          showHome={false}
        />
        <ShellHeaderActions />
      </ShellHeader>

      <ShellContent>
        <div className="@container flex-1 space-y-6 overflow-y-auto p-6">
          <div className="space-y-1">
            <h2 className="font-semibold text-2xl tracking-tight">
              {m.home_welcome()}
            </h2>
            <p className="text-muted-foreground">{m.home_subtitle()}</p>
          </div>

          <div className="grid @md:grid-cols-2 gap-4">
            {quickLinks.map(({ to, title, description, icon: Icon }) => (
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
