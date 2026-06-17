"use client";

import { useQuery } from "@tanstack/react-query";
import { useChatOrgConnection } from "@/components/chat/connection/chat-org-connection";

export function useOrgMemory() {
  const { getOrgMemory } = useChatOrgConnection();
  return useQuery({
    queryKey: ["org-memory"],
    queryFn: getOrgMemory,
    staleTime: 30_000,
  });
}
