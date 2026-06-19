"use client";

import { ChatOrgConnection } from "@/components/chat/connection/chat-org-connection";
import { BottomChatDock } from "@/components/chat/dock/bottom-chat-dock";
import { useActiveOrganizationId } from "@/hooks/use-organization";

export function ChatDockMount() {
  const organizationId = useActiveOrganizationId();
  if (!organizationId) {
    return null;
  }
  return (
    <ChatOrgConnection key={organizationId} organizationId={organizationId}>
      <BottomChatDock />
    </ChatOrgConnection>
  );
}
