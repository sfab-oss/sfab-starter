"use client";

import { Shell, ShellInset } from "@workspace/ui/components/brand/shell";
import type { NavigationItem } from "@workspace/ui/lib/navigation-config";
import { SIDEBAR_NAVIGATION } from "@workspace/ui/lib/navigation-config";
import { Bot } from "lucide-react";
import { AppShellSidebar } from "../../_shared/app-shell-sidebar";
import { RegistryQueryProvider } from "../../_shared/registry-query-provider";
import { FullScreenChat } from "./components/full-screen-chat";

const CHAT_NAVIGATION: NavigationItem[] = [
  { id: "assistant", label: "Assistant", path: "/assistant", icon: Bot },
  ...SIDEBAR_NAVIGATION,
];

export default function ChatPage() {
  return (
    <RegistryQueryProvider>
      <Shell
        sidebar={
          <AppShellSidebar activeId="assistant" items={CHAT_NAVIGATION} />
        }
      >
        <ShellInset>
          <FullScreenChat />
        </ShellInset>
      </Shell>
    </RegistryQueryProvider>
  );
}
