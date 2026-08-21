"use client";

import { authClient } from "@workspace/auth/client";
import { ChatOrgConnection } from "@/components/chat/connection/chat-org-connection";
import { BottomChatDock } from "@/components/chat/dock/bottom-chat-dock";
import { useActiveOrganizationId } from "@/hooks/use-organization";

export function ChatDockMount() {
  const sessionOrgId = useActiveOrganizationId();
  const { data: organizations } = authClient.useListOrganizations();
  const organizationId = sessionOrgId ?? organizations?.[0]?.id;
  if (!organizationId) {
    return null;
  }
  return (
    <ChatOrgConnection key={organizationId} organizationId={organizationId}>
      <BottomChatDock />
    </ChatOrgConnection>
  );
}
