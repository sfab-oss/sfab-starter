import { ChatEngineProvider } from "./providers/chat-engine";
import { useChatSession } from "./providers/chat-session";
import { PageContextProvider } from "./providers/page-context";
import { ToolHandlerRegistry } from "./providers/tool-handlers";

export function ChatOrchestrator({ children }: { children: React.ReactNode }) {
  const { currentChatId, initialMessages, markChatPersisted } =
    useChatSession();

  return (
    <PageContextProvider>
      <ToolHandlerRegistry>
        <ChatEngineProvider
          id={currentChatId}
          initialMessages={initialMessages}
          key={currentChatId}
          onNewChat={markChatPersisted}
        >
          {children}
        </ChatEngineProvider>
      </ToolHandlerRegistry>
    </PageContextProvider>
  );
}
