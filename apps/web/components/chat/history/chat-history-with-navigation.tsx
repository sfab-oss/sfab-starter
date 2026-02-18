"use client";

import { useRouter } from "next/navigation";
import { ChatHistory } from "@/components/chat/history/chat-history";

interface ChatHistoryWithNavigationProps {
  currentChatId: string;
}

export function ChatHistoryWithNavigation({
  currentChatId,
}: ChatHistoryWithNavigationProps) {
  const router = useRouter();

  const handleNavigate = (chatId: string) => {
    router.push(`/chat/${chatId}`);
  };

  return (
    <ChatHistory currentChatId={currentChatId} onNavigate={handleNavigate} />
  );
}
