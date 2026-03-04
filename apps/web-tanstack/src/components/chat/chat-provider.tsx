import { useChat } from "@ai-sdk/react";
import { toast } from "@workspace/ui/components/shadcn/sonner";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { createContext, type ReactNode, useContext, useRef } from "react";
import type { AiToolId } from "@/lib/ai/tools/registry";
import { createId } from "@/lib/utils";
import type { AIUIMessage } from "@/types/ai";
import { useToolHandlers } from "./tool-handler-registry";

type ChatContextValue = ReturnType<typeof useChat<AIUIMessage>>;

const ChatContext = createContext<ChatContextValue | null>(null);

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within a <Chat />");
  }
  return context;
}

export interface ChatProviderProps {
  id: string;
  initialMessages?: AIUIMessage[];
  onNewChat?: (chatId: string) => void;
  children: ReactNode;
  agentId?: string;
}

export function ChatProvider({
  id,
  initialMessages = [],
  onNewChat,
  children,
}: ChatProviderProps) {
  const toolHandlers = useToolHandlers();
  const onNewChatRef = useRef(onNewChat);
  onNewChatRef.current = onNewChat;

  const chat = useChat<AIUIMessage>({
    id,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat/messages",
      prepareSendMessagesRequest({ messages, body, trigger, messageId }) {
        if (initialMessages.length === 0 && onNewChatRef.current) {
          onNewChatRef.current(id);
        }
        return {
          body: {
            ...body,
            chatId: id,
            newMessage: messages.at(-1),
            trigger,
            messageId,
          },
        };
      },
    }),
    generateId: () => createId("msg"),
    sendAutomaticallyWhen: (messages) => {
      return (
        lastAssistantMessageIsCompleteWithToolCalls(messages) ||
        lastAssistantMessageIsCompleteWithApprovalResponses(messages)
      );
    },
    onToolCall: async (toolCallProps) => {
      const handler = toolHandlers.current[toolCallProps.toolCall.toolName];
      if (handler) {
        try {
          const result = await handler(toolCallProps.toolCall.input);
          chat.addToolOutput({
            tool: toolCallProps.toolCall.toolName as AiToolId,
            toolCallId: toolCallProps.toolCall.toolCallId,
            output: { success: true, data: result },
          });
          return;
        } catch (error) {
          chat.addToolOutput({
            tool: toolCallProps.toolCall.toolName as AiToolId,
            toolCallId: toolCallProps.toolCall.toolCallId,
            output: { success: false, error: String(error) },
          });
          return;
        }
      }

      if (
        !toolCallProps.toolCall.dynamic &&
        toolCallProps.toolCall.toolName === "show-message"
      ) {
        toast.success(toolCallProps.toolCall.input.message);

        chat.addToolOutput({
          tool: toolCallProps.toolCall.toolName,
          toolCallId: toolCallProps.toolCall.toolCallId,
          output: {
            success: true,
          },
        });
        return;
      }
    },
  });

  return <ChatContext.Provider value={chat}>{children}</ChatContext.Provider>;
}
