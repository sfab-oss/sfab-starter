import { getChat, getChatMessages } from "@workspace/db/services/chat";
import { AppBreadcrumbs } from "@workspace/ui/components/brand/app-breadcrumbs";
import {
  AppLayoutContent,
  AppLayoutHeader,
  AppLayoutHeaderActions,
  AppLayoutPage,
} from "@workspace/ui/components/brand/app-layout";
import { ChatProvider } from "@/components/chat/chat-provider";
import { ChatHistoryWithNavigation } from "@/components/chat/history/chat-history-with-navigation";
import { ChatContent } from "@/components/chat/parts/chat-content";
import { ChatInput } from "@/components/chat/parts/chat-input";
import { ChatMessages } from "@/components/chat/parts/chat-messages";
import { ToolHandlerRegistry } from "@/components/chat/tool-handler-registry";
import type { AIUIMessage } from "@/types/ai";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const savedChat = await getChat(id);

  let initialMessages: AIUIMessage[] = [];

  if (savedChat) {
    const messages = await getChatMessages(id);
    if (messages) {
      initialMessages = messages as AIUIMessage[];
    }
  }

  return (
    <AppLayoutPage>
      <AppLayoutHeader>
        <AppBreadcrumbs items={[{ title: "Chat" }]} />
        <AppLayoutHeaderActions>
          <ChatHistoryWithNavigation currentChatId={id} />
        </AppLayoutHeaderActions>
      </AppLayoutHeader>
      <AppLayoutContent>
        <ToolHandlerRegistry>
          <ChatProvider id={id} initialMessages={initialMessages}>
            <ChatContent>
              <ChatMessages />
              <ChatInput context={{}} placeholder="Ask anything..." />
            </ChatContent>
          </ChatProvider>
        </ToolHandlerRegistry>
      </AppLayoutContent>
    </AppLayoutPage>
  );
}
