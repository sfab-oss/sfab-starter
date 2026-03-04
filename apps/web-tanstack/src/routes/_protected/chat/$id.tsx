import { createFileRoute } from "@tanstack/react-router";
import { AppBreadcrumbs } from "@workspace/ui/components/brand/app-breadcrumbs";
import {
  AppLayoutContent,
  AppLayoutHeader,
  AppLayoutHeaderActions,
  AppLayoutPage,
} from "@workspace/ui/components/brand/app-layout";
import { ChatOrchestrator } from "@/components/chat/chat-orchestrator";
import {
  ChatStateProvider,
  useChatState,
} from "@/components/chat/chat-state-provider";
import { ChatHistory } from "@/components/chat/history/chat-history";
import { ChatContent } from "@/components/chat/parts/chat-content";
import { ChatInput } from "@/components/chat/parts/chat-input";
import { ChatMessages } from "@/components/chat/parts/chat-messages";
import { useGetChat } from "@/hooks/use-chat";
import type { AIUIMessage } from "@/types/ai";

export const Route = createFileRoute("/_protected/chat/$id")({
  component: ChatPage,
});

function ChatPage() {
  const { id } = Route.useParams();
  const { data, isLoading } = useGetChat(id);

  if (isLoading) {
    return (
      <AppLayoutPage>
        <AppLayoutHeader>
          <AppBreadcrumbs items={[{ title: "Chat" }]} />
        </AppLayoutHeader>
        <AppLayoutContent>
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground">Loading chat...</p>
          </div>
        </AppLayoutContent>
      </AppLayoutPage>
    );
  }

  const chat = data && !("error" in data) ? data : null;
  const initialMessages = chat?.messages
    ? (chat.messages as unknown as AIUIMessage[])
    : [];

  return (
    <ChatStateProvider
      defaultChatId={id}
      defaultIsNewChat={!chat}
      defaultMessages={initialMessages}
    >
      <ChatPageContent />
    </ChatStateProvider>
  );
}

function ChatPageContent() {
  const { currentChatId, navigateToChat } = useChatState();

  return (
    <AppLayoutPage>
      <AppLayoutHeader>
        <AppBreadcrumbs items={[{ title: "Chat" }]} />
        <AppLayoutHeaderActions>
          <ChatHistory
            currentChatId={currentChatId}
            onNavigate={navigateToChat}
          />
        </AppLayoutHeaderActions>
      </AppLayoutHeader>
      <AppLayoutContent>
        <ChatOrchestrator>
          <ChatContent>
            <ChatMessages />
            <ChatInput additionalContext={{}} placeholder="Ask anything..." />
          </ChatContent>
        </ChatOrchestrator>
      </AppLayoutContent>
    </AppLayoutPage>
  );
}
