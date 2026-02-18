"use client";

import { useChat } from "@ai-sdk/react";
import { toast } from "@workspace/ui/components/shadcn/sonner";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { createContext, type ReactNode, useContext } from "react";
import type { aiToolId } from "@/lib/ai/tools/registry";
import { createId } from "@/lib/utils";
import type { AIUIMessage } from "@/types/ai";
import { useToolHandlers } from "./tool-handler-registry";

// --- 1. Context & Types ---

type ChatContextValue = ReturnType<typeof useChat<AIUIMessage>>;

const ChatContext = createContext<ChatContextValue | null>(null);

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within a <Chat />");
  }
  return context;
}

// --- 2. The Provider (The Engine) ---

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
  agentId,
  ...useChatOptions
}: ChatProviderProps) {
  const toolHandlers = useToolHandlers();

  const chat = useChat<AIUIMessage>({
    id,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat/messages",
      prepareSendMessagesRequest({ messages, body, trigger, messageId }) {
        if (initialMessages.length === 0 && onNewChat) {
          onNewChat(id);
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
      // Handle client-side tools first
      const handler = toolHandlers.current[toolCallProps.toolCall.toolName];
      if (handler) {
        try {
          const result = await handler(toolCallProps.toolCall.input);
          chat.addToolOutput({
            tool: toolCallProps.toolCall.toolName as aiToolId,
            toolCallId: toolCallProps.toolCall.toolCallId,
            output: { success: true, data: result },
          });
          return;
        } catch (error) {
          chat.addToolOutput({
            tool: toolCallProps.toolCall.toolName as aiToolId,
            toolCallId: toolCallProps.toolCall.toolCallId,
            output: { success: false, error: String(error) },
          });
          return;
        }
      }

      // Handle built-in tools
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
    ...useChatOptions,
  });

  return <ChatContext.Provider value={chat}>{children}</ChatContext.Provider>;
}
