import { getChat, getChatMessages } from "@workspace/db/services/chat";
import {
  AppLayoutPage,
  AppLayoutResizable,
  AppLayoutResizablePanelPrimary,
  AppLayoutResizablePanelSecondary,
} from "@workspace/ui/components/brand/app-layout";
import { cookies } from "next/headers";
import { ChatOrchestrator } from "@/components/chat/chat-orchestrator";
import { ChatPanel } from "@/components/chat/chat-panel";
import { ChatStateProvider } from "@/components/chat/chat-state-provider";
import type { AIUIMessage } from "@/types/ai";

export default async function ChatLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const activeChatId = cookieStore.get("active_chat_id")?.value;

  let defaultChatId: string | undefined;
  let defaultMessages: AIUIMessage[] = [];
  let defaultIsNewChat = true;

  if (activeChatId) {
    const chat = await getChat(activeChatId);
    if (chat) {
      const messages = await getChatMessages(activeChatId);
      if (messages) {
        defaultChatId = activeChatId;
        defaultMessages = messages as AIUIMessage[];
        defaultIsNewChat = false;
      }
    }
  }

  // Read panel state from cookies for proper SSR hydration
  const panelVisibility = cookieStore.get("app_panels_visibility")?.value;
  let defaultPanels: Record<string, boolean> | undefined;
  if (panelVisibility) {
    try {
      defaultPanels = JSON.parse(panelVisibility) as Record<string, boolean>;
    } catch {
      // Ignore parse errors
    }
  }

  return (
    <ChatStateProvider
      defaultChatId={defaultChatId}
      defaultIsNewChat={defaultIsNewChat}
      defaultMessages={defaultMessages}
    >
      <ChatOrchestrator>
        <AppLayoutPage>
          <AppLayoutResizable
            autoSaveId="chat-layout"
            defaultPanels={defaultPanels}
          >
            <AppLayoutResizablePanelPrimary id="content-panel" order={1}>
              {children}
            </AppLayoutResizablePanelPrimary>
            <AppLayoutResizablePanelSecondary id="chat-panel" order={2}>
              <ChatPanel />
            </AppLayoutResizablePanelSecondary>
          </AppLayoutResizable>
        </AppLayoutPage>
      </ChatOrchestrator>
    </ChatStateProvider>
  );
}
