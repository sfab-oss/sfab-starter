import { AppLayoutHeader } from "@workspace/ui/components/brand/app-layout";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Plus } from "lucide-react";
import { ChatHistory } from "./history/chat-history";
import { ChatContent } from "./parts/chat-content";
import { ChatInput } from "./parts/chat-input";
import { ChatMessages } from "./parts/chat-messages";
import { ExportChatButton } from "./parts/chat-placeholders";
import { useChatSession } from "./providers/chat-session";

export function ChatPanel() {
  const { currentChatId, startNewChat, navigateToChat } = useChatSession();

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
        <ChatInput />
      </ChatContent>
    </>
  );
}
