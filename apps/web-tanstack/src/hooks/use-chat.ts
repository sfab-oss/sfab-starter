import { useQuery } from "@tanstack/react-query";
import { client } from "../lib/client";

export const getChatKey = (id: string) => ["chats", id];

export const getAllChatsKey = () => ["chats"];

export function useGetChat(id: string | null, options?: { enabled?: boolean }) {
  const effectiveId = id ?? "";

  return useQuery({
    queryKey: getChatKey(effectiveId),
    queryFn: async () => {
      const response = await client.protected.chat[":chatId"].$get({
        param: { chatId: effectiveId },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error("Failed to fetch chat");
      }
      if ("error" in data) {
        throw new Error("No data received");
      }
      return data;
    },
    enabled: options?.enabled === undefined ? !!id : options.enabled,
    placeholderData: (previousData) => previousData,
  });
}

export function useGetAllChats() {
  return useQuery({
    queryKey: getAllChatsKey(),
    queryFn: async () => {
      const response = await client.protected.chat.$get({
        query: { sort: "desc" },
      });
      const data = await response.json();
      return data;
    },
  });
}
