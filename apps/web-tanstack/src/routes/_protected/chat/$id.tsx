import { createFileRoute } from "@tanstack/react-router";
import { AppBreadcrumbs } from "@workspace/ui/components/brand/app-breadcrumbs";
import {
  AppLayoutContent,
  AppLayoutHeader,
  AppLayoutHeaderActions,
  AppLayoutPage,
} from "@workspace/ui/components/brand/app-layout";
import { Button } from "@workspace/ui/components/shadcn/button";
import { ArrowLeft, Plus } from "lucide-react";
import { ChatOrchestrator } from "@/components/chat/chat-orchestrator";
import { ChatHistory } from "@/components/chat/history/chat-history";
import { ChatContent } from "@/components/chat/parts/chat-content";
import { ChatInput } from "@/components/chat/parts/chat-input";
import { ChatMessages } from "@/components/chat/parts/chat-messages";
import { ExportChatButton } from "@/components/chat/parts/chat-placeholders";
import { SubAgentBar } from "@/components/chat/parts/sub-agent-bar";
import { SubAgentThreadView } from "@/components/chat/parts/sub-agent-thread-view";
import {
  ChatSessionProvider,
  useChatSession,
} from "@/components/chat/providers/chat-session";
import { useSubAgentView } from "@/components/chat/providers/sub-agent-view";
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
  return (
    <ChatOrchestrator>
      <ChatPageInner />
    </ChatOrchestrator>
  );
}

function ChatPageInner() {
  const { currentChatId, startNewChat, navigateToChat } = useChatSession();
  const { viewingChildChatId, returnToParent } = useSubAgentView();

  if (viewingChildChatId) {
    return (
      <AppLayoutPage>
        <AppLayoutHeader>
          <Button
            className="gap-1.5"
            onClick={returnToParent}
            size="sm"
            variant="ghost"
          >
            <ArrowLeft className="size-4" />
            Back to chat
          </Button>
          <span className="truncate font-mono text-muted-foreground text-xs">
            Sub-agent thread
          </span>
        </AppLayoutHeader>
        <AppLayoutContent>
          <ChatContent>
            <SubAgentThreadView chatId={viewingChildChatId} />
          </ChatContent>
        </AppLayoutContent>
      </AppLayoutPage>
    );
  }

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
        <ChatContent>
          <ChatMessages />
          <SubAgentBar />
          <ChatInput additionalContext={{}} placeholder="Ask anything..." />
        </ChatContent>
      </AppLayoutContent>
    </AppLayoutPage>
  );
}
