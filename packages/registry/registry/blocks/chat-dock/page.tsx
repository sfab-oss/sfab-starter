"use client";

import {
  Shell,
  ShellFooter,
  ShellInset,
} from "@workspace/ui/components/brand/shell";
import { AppShellSidebar } from "../../_shared/app-shell-sidebar";
import { RegistryQueryProvider } from "../../_shared/registry-query-provider";
import { ChatDock } from "./components/chat-dock";
import { DockRouteBackdrop } from "./components/dock-route-backdrop";

/**
 * The bottom chat dock as it lives in an app route: mounted in the shell footer
 * as a global overlay above the active page (here, a mock operations route).
 * Open the launcher to dock the assistant, then expand it for the file viewer.
 */
export default function ChatDockPage() {
  return (
    <RegistryQueryProvider>
      <Shell sidebar={<AppShellSidebar activeId="today" />}>
        <ShellInset>
          <DockRouteBackdrop />
        </ShellInset>
        <ShellFooter>
          <ChatDock />
        </ShellFooter>
      </Shell>
    </RegistryQueryProvider>
  );
}
