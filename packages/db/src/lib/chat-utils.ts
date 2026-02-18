import type { DBMessage } from "@workspace/db/types/chat";
import type { BaseAIUIMessage } from "@workspace/types/ai";

export function dbMessageToAIMessage(message: DBMessage): BaseAIUIMessage {
  return {
    id: message.id,
    role: message.role,
    parts: message.parts,
    metadata: message.metadata,
  };
}

export function dbMessagesToAIMessages(
  messages: DBMessage[]
): BaseAIUIMessage[] {
  return messages.map(dbMessageToAIMessage);
}
