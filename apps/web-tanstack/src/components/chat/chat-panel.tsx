import { AppLayoutHeader } from "@workspace/ui/components/brand/app-layout";
import { Button } from "@workspace/ui/components/shadcn/button";
import { ArrowLeft, Plus } from "lucide-react";
import { ChatHistory } from "./history/chat-history";
import { ChatContent } from "./parts/chat-content";
import { ChatInput } from "./parts/chat-input";
import { ChatMessages } from "./parts/chat-messages";
import { ExportChatButton } from "./parts/chat-placeholders";
import { SubAgentBar } from "./parts/sub-agent-bar";
import { SubAgentThreadView } from "./parts/sub-agent-thread-view";
import { useChatSession } from "./providers/chat-session";
import { useSubAgentView } from "./providers/sub-agent-view";

export function ChatPanel() {
  const { currentChatId, startNewChat, navigateToChat } = useChatSession();
  const { viewingChildChatId, returnToParent } = useSubAgentView();

  if (viewingChildChatId) {
    return (
      <>
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

        <ChatContent>
          <SubAgentThreadView chatId={viewingChildChatId} />
        </ChatContent>
      </>
    );
  }

  return (
    <>
      <AppLayoutHeader>
        <span className="truncate font-mono text-muted-foreground text-xs">
          Chat
        </span>
        <div className="ml-auto flex items-center gap-1">
          <ExportChatButton />
          <ChatHistory
            currentChatId={currentChatId}
            onNavigate={navigateToChat}
          />
          <Button onClick={startNewChat} size="icon" variant="ghost">
            <Plus className="size-4" />
            <span className="sr-only">New Chat</span>
          </Button>
        </div>
      </AppLayoutHeader>

      <ChatContent>
        <ChatMessages />
        <SubAgentBar />
        <ChatInput />
      </ChatContent>
    </>
  );
}
