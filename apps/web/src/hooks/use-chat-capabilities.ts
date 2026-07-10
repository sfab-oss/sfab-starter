"use client";

import { useQuery } from "@tanstack/react-query";
import type { OrgChatProviderCapabilities } from "@workspace/agent/inference";
import { client } from "@/lib/client";

export const chatCapabilitiesQueryKey = ["chat", "capabilities"] as const;

/**
 * Active org-chat provider input capabilities (ALW-453). Used to hide/disable
 * the attach control for text-only providers before send.
 */
export function useChatCapabilities() {
  return useQuery({
    queryKey: chatCapabilitiesQueryKey,
    queryFn: async (): Promise<OrgChatProviderCapabilities> => {
      const res = await client.protected.chat.capabilities.$get();
      if (!res.ok) {
        throw new Error("Failed to load chat capabilities");
      }
      return res.json();
    },
    staleTime: Number.POSITIVE_INFINITY,
  });
}
