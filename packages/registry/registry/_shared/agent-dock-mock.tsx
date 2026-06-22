import { Button } from "@workspace/ui/components/shadcn/button";
import { MessageSquare } from "lucide-react";

/** Gallery mock — agent dock footer placeholder (reuse demo, not production). */
export function AgentDockMock() {
  return (
    <div
      className="flex items-center justify-between gap-2 border-t bg-background px-4 py-2 md:rounded-b-xl"
      data-slot="agent-dock-mock"
    >
      <p className="text-muted-foreground text-sm">
        Operations agent — mock dock
      </p>
      <Button size="sm" type="button" variant="outline">
        <MessageSquare className="size-4" />
        Open chat
      </Button>
    </div>
  );
}
