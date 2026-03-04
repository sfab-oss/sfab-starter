import { createFileRoute, redirect } from "@tanstack/react-router";
import { createId } from "@/lib/utils";

export const Route = createFileRoute("/_protected/chat/")({
  beforeLoad: () => {
    const newChatId = createId("chat");
    throw redirect({
      to: "/chat/$id",
      params: { id: newChatId },
    });
  },
});
