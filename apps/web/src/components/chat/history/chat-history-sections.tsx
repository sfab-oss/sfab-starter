import type { ChatSummary } from "@workspace/agent/types";
import { useChatOrgConnection } from "@/components/chat/connection/chat-org-connection";
import {
  useChats,
  useChatTabsStore,
} from "@/components/chat/dock/chat-tabs-store";

export function useOrgChatHistory() {
  const { organizationId } = useChatOrgConnection();
  return useChats(organizationId);
}

export function openOrgChatTab(
  organizationId: string,
  chat: ChatSummary
): void {
  const store = useChatTabsStore.getState();
  store.openTab(organizationId, chat.id, chat.title);
  store.openBody();
}
