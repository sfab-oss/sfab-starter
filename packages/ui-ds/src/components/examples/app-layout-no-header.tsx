"use client";

import {
  AppLayout,
  AppLayoutContent,
  AppLayoutPage,
} from "@workspace/ui/components/brand/app-layout";
import { AppSidebar } from "@workspace/ui-ds/components/blocks/app-01/components/app-sidebar";

export function AppLayoutNoHeader() {
  return (
    <AppLayout sidebar={<AppSidebar />}>
      <AppLayoutPage>
        <AppLayoutContent>
          <div className="p-6">
            <h3 className="font-medium text-lg">Content Area</h3>
            <p>This layout has no header, providing a minimal interface.</p>
          </div>
        </AppLayoutContent>
      </AppLayoutPage>
    </AppLayout>
  );
}
