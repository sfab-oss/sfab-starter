import { createFileRoute } from "@tanstack/react-router";
import { AppBreadcrumbs } from "@workspace/ui/components/brand/app-breadcrumbs";
import {
  AppLayoutContent,
  AppLayoutHeader,
  AppLayoutHeaderActions,
  AppLayoutPage,
} from "@workspace/ui/components/brand/app-layout";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Plus } from "lucide-react";
import { ChatOrchestrator } from "@/components/chat/chat-orchestrator";
import { ChatHistory } from "@/components/chat/history/chat-history";
import { ChatContent } from "@/components/chat/parts/chat-content";
import { ChatInput } from "@/components/chat/parts/chat-input";
import { ChatMessages } from "@/components/chat/parts/chat-messages";
import { ExportChatButton } from "@/components/chat/parts/chat-placeholders";
import {
  ChatSessionProvider,
  useChatSession,
} from "@/components/chat/providers/chat-session";
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
    <ChatSessionProvider
      defaultChatId={id}
      defaultIsNewChat={!chat}
      defaultMessages={initialMessages}
    >
      <ChatPageContent />
    </ChatSessionProvider>
  );
}

function ChatPageContent() {
  const { currentChatId, startNewChat, navigateToChat } = useChatSession();

  return (
    <AppLayoutPage>
      <AppLayoutHeader>
        <AppBreadcrumbs items={[{ title: "Chat" }]} />
        <AppLayoutHeaderActions>
          <ExportChatButton />
          <ChatHistory
            currentChatId={currentChatId}
            onNavigate={navigateToChat}
          />
          <Button onClick={startNewChat} size="icon" variant="ghost">
            <Plus className="size-4" />
            <span className="sr-only">New Chat</span>
          </Button>
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
