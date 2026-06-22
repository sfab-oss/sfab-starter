import { AppBreadcrumbs } from "@workspace/ui/components/brand/app-breadcrumbs";
import {
  Shell,
  ShellContent,
  ShellHeader,
  ShellHeaderActions,
  ShellHeaderSidebarTrigger,
  ShellInset,
  ShellPage,
} from "@workspace/ui/components/brand/shell";
import { Button } from "@workspace/ui/components/shadcn/button";
import { AppShellSidebar } from "../../_shared/app-shell-sidebar";
import { RegistryQueryProvider } from "../../_shared/registry-query-provider";

export default function ShellDemo() {
  return (
    <RegistryQueryProvider>
      <Shell sidebar={<AppShellSidebar activeId="people" />}>
        <ShellInset>
          <ShellPage>
            <ShellHeader>
              <ShellHeaderSidebarTrigger className="-ml-1" />
              <AppBreadcrumbs
                items={[{ title: "Directory", href: "#" }, { title: "People" }]}
              />
              <ShellHeaderActions>
                <Button size="sm" type="button">
                  New person
                </Button>
              </ShellHeaderActions>
            </ShellHeader>
            <ShellContent>
              <div className="flex flex-1 items-center justify-center p-8 text-muted-foreground text-sm">
                Page content — tables, forms, and property grids compose inside
                `ShellContent`.
              </div>
            </ShellContent>
          </ShellPage>
        </ShellInset>
      </Shell>
    </RegistryQueryProvider>
  );
}
