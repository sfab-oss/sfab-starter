"use client";

import { useQuery } from "@tanstack/react-query";
import type { OrgChatModelCapabilities } from "@workspace/agent/inference";
import { client } from "@/lib/client";

export const chatCapabilitiesQueryKey = ["chat", "capabilities"] as const;

/**
 * Active org-chat model input capabilities (ALW-453). Used to hide/disable
 * the attach control for text-only models before send.
 */
export function useChatCapabilities() {
  return useQuery({
    queryKey: chatCapabilitiesQueryKey,
    queryFn: async (): Promise<OrgChatModelCapabilities> => {
      const res = await client.protected.chat.capabilities.$get();
      if (!res.ok) {
        throw new Error("Failed to load chat capabilities");
      }
      return res.json();
    },
    staleTime: Number.POSITIVE_INFINITY,
  });
}
