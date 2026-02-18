import { AppBreadcrumbs } from "@workspace/ui/components/brand/app-breadcrumbs";
import {
  AppLayout,
  AppLayoutContent,
  AppLayoutHeader,
  AppLayoutPage,
} from "@workspace/ui/components/brand/app-layout";
import { AppSidebar } from "@workspace/ui-ds/components/blocks/app-01/components/app-sidebar";

export default function Page() {
  return (
    <AppLayout sidebar={<AppSidebar />}>
      <AppLayoutPage>
        <AppLayoutHeader>
          <AppBreadcrumbs />
        </AppLayoutHeader>
        <AppLayoutContent className="p-6">
          <div className="font-bold text-2xl">Content Area</div>
        </AppLayoutContent>
      </AppLayoutPage>
    </AppLayout>
  );
}
