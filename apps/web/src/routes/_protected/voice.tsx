import { createFileRoute } from "@tanstack/react-router";
import { AppBreadcrumbs } from "@workspace/ui/components/brand/app-breadcrumbs";
import {
  ShellContent,
  ShellHeader,
  ShellHeaderActions,
  ShellPage,
} from "@workspace/ui/components/brand/shell";
import { ShellHeaderSidebarTrigger } from "@/components/layout/shell-header-sidebar-trigger";
import { VoiceCallPanel } from "@/components/voice/voice-call-panel";
import { m } from "@/paraglide/messages.js";

export const Route = createFileRoute("/_protected/voice")({
  component: VoicePage,
});

function VoicePage() {
  const { user } = Route.useRouteContext();

  return (
    <ShellPage>
      <ShellHeader>
        <ShellHeaderSidebarTrigger className="-ml-1" />
        <AppBreadcrumbs
          ellipsisAriaLabel={m.breadcrumb_ellipsis_aria()}
          items={[{ title: m.voice_title() }]}
          showHome={false}
        />
        <ShellHeaderActions />
      </ShellHeader>
      <ShellContent>
        <div className="@container flex-1 space-y-6 overflow-y-auto p-6">
          <div className="space-y-1">
            <h2 className="font-semibold text-2xl tracking-tight">
              {m.voice_title()}
            </h2>
            <p className="text-muted-foreground">
              {m.voice_page_description()}
            </p>
          </div>
          <VoiceCallPanel sessionName={user.id} />
        </div>
      </ShellContent>
    </ShellPage>
  );
}
