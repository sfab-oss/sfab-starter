import type { DBMessage } from "@workspace/db/types/chat";
import type { AIUIMessage } from "@/types/ai";

export function dbMessageToAIMessage(message: DBMessage): AIUIMessage {
  return {
    id: message.id,
    role: message.role,
    // @ts-expect-error - TODO: Fix this, there is a mismatch between the BaseAIUIMessage and AIUIMessage types for parts
    parts: message.parts,
    metadata: message.metadata,
  };
}

export function dbMessagesToAIMessages(messages: DBMessage[]): AIUIMessage[] {
  return messages.map(dbMessageToAIMessage);
}
