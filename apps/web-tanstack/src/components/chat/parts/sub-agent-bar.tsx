import { useQuery } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/shadcn/button";
import { client } from "@/lib/client";
import { useChatEngine } from "../providers/chat-engine";
import { useSubAgentView } from "../providers/sub-agent-view";

export function SubAgentBar() {
  const { id: chatId } = useChatEngine();
  const { viewChildChat } = useSubAgentView();

  const { data: children } = useQuery({
    queryKey: ["chat-children", chatId],
    queryFn: async () => {
      const response = await client.protected.chat[":chatId"].children.$get({
        param: { chatId },
      });
      const data = await response.json();
      if (!response.ok || "error" in data) {
        return [];
      }
      return data;
    },
    refetchInterval: 3000,
  });

  const activeChildren = children?.filter(
    (child) => child.status === "processing"
  );

  if (!activeChildren || activeChildren.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 border-t px-4 py-2">
      <span className="text-muted-foreground text-xs">Sub-agents:</span>
      {activeChildren.map((child) => (
        <Button
          className="h-7 gap-1.5 text-xs"
          key={child.id}
          onClick={() => viewChildChat(child.id)}
          size="sm"
          variant="outline"
        >
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
          {child.title.length > 30
            ? `${child.title.slice(0, 27)}...`
            : child.title}
        </Button>
      ))}
    </div>
  );
}
