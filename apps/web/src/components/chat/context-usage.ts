import type { OrgChatMessage } from "@/components/chat/dock/chat-tabs-store";

export function isCompactionMessage(message: OrgChatMessage): boolean {
  return message.id.startsWith("compaction_");
}
