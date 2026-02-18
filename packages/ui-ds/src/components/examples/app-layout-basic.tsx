"use client";

import {
  AppLayout,
  AppLayoutContent,
  AppLayoutHeader,
  AppLayoutHeaderTitle,
  AppLayoutPage,
} from "@workspace/ui/components/brand/app-layout";
import { AppSidebar } from "@workspace/ui-ds/components/blocks/app-01/components/app-sidebar";

export function AppLayoutBasic() {
  return (
    <AppLayout sidebar={<AppSidebar />}>
      <AppLayoutPage>
        <AppLayoutHeader>
          <AppLayoutHeaderTitle>Dashboard</AppLayoutHeaderTitle>
        </AppLayoutHeader>
        <AppLayoutContent>
          <div className="p-6">
            <h3 className="font-medium text-lg">Content Area</h3>
            <p>This is the main content area of the application.</p>
          </div>
        </AppLayoutContent>
      </AppLayoutPage>
    </AppLayout>
  );
}
