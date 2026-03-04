import { ChatPageConfigProvider } from "./chat-page-config";
import { ChatProvider } from "./chat-provider";
import { useChatState } from "./chat-state-provider";
import { ToolHandlerRegistry } from "./tool-handler-registry";

export function ChatOrchestrator({ children }: { children: React.ReactNode }) {
  const { currentChatId, initialMessages, markChatPersisted } = useChatState();

  return (
    <ChatPageConfigProvider>
      <ToolHandlerRegistry>
        <ChatProvider
          id={currentChatId}
          initialMessages={initialMessages}
          key={currentChatId}
          onNewChat={markChatPersisted}
        >
          {children}
        </ChatProvider>
      </ToolHandlerRegistry>
    </ChatPageConfigProvider>
  );
}
