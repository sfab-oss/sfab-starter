import { useQuery } from "@tanstack/react-query";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolOutput,
} from "@workspace/ui/components/ai-elements/tool";
import { Button } from "@workspace/ui/components/shadcn/button";
import type { ToolUIPart } from "ai";
import { memo, useCallback, useEffect, useRef } from "react";
import { getChatKey } from "@/hooks/use-chat";
import type { AITools } from "@/lib/ai/tools";
import { client } from "@/lib/client";
import { useChatEngine } from "../providers/chat-engine";
import { useSubAgentView } from "../providers/sub-agent-view";

type RunAgentPart = ToolUIPart<Pick<AITools, "run-agent">>;

export interface RunAgentToolProps {
  part: RunAgentPart;
}

type ChildChatStatus = "idle" | "processing" | "failed" | null;

export const RunAgentTool = memo(({ part }: RunAgentToolProps) => {
  const { viewChildChat } = useSubAgentView();
  const { sendMessage, status: chatStatus } = useChatEngine();
  const hasNotified = useRef(false);

  const output = part.output as
    | {
        success: true;
        mode: "foreground" | "background";
        childChatId?: string;
        output?: string;
        message?: string;
      }
    | { success: false; error: string }
    | undefined;

  const isBackground =
    output && "mode" in output && output.mode === "background";
  const childChatId =
    output && "childChatId" in output ? output.childChatId : null;

  // Poll for background task status using the typed Hono client
  const { data: childChat } = useQuery({
    queryKey: [...getChatKey(childChatId ?? ""), "status"],
    queryFn: async () => {
      const res = await client.protected.chat[":chatId"].$get({
        param: { chatId: childChatId as string },
      });
      if (!res.ok) {
        return null;
      }
      const data = await res.json();
      if ("error" in data) {
        return null;
      }
      return data;
    },
    enabled: !!childChatId && !!isBackground,
    refetchInterval: 3000,
  });

  const childStatus: ChildChatStatus =
    (childChat?.status as ChildChatStatus) ?? null;

  // Auto-send notification when background task completes
  useEffect(() => {
    if (
      !hasNotified.current &&
      childChatId &&
      isBackground &&
      (childStatus === "idle" || childStatus === "failed") &&
      chatStatus !== "streaming" &&
      chatStatus !== "submitted"
    ) {
      hasNotified.current = true;
      const statusText =
        childStatus === "idle" ? "completed successfully" : "failed";
      sendMessage(
        {
          role: "user",
          parts: [
            {
              type: "text",
              text: `[System] Background sub-agent ${childChatId} has ${statusText}. Use get-task-result with childChatId "${childChatId}" to review the output.`,
            },
          ],
        },
        {
          body: {
            context: { route: { pathname: window.location.pathname } },
          },
        }
      );
    }
  }, [childStatus, chatStatus, childChatId, isBackground, sendMessage]);

  const handleViewThread = useCallback(() => {
    if (childChatId) {
      viewChildChat(childChatId);
    }
  }, [childChatId, viewChildChat]);

  // Determine display status
  const displayStatus = (() => {
    if (part.state === "input-streaming" || part.state === "input-available") {
      return "starting";
    }
    if (!output) {
      return "pending";
    }
    if (!output.success) {
      return "error";
    }
    if (isBackground) {
      if (childStatus === "processing") {
        return "running";
      }
      if (childStatus === "idle") {
        return "completed";
      }
      if (childStatus === "failed") {
        return "failed";
      }
      return "running";
    }
    return "completed";
  })();

  const statusColors: Record<string, string> = {
    pending: "text-muted-foreground",
    starting: "text-muted-foreground",
    running: "text-blue-600",
    completed: "text-green-600",
    failed: "text-red-600",
    error: "text-red-600",
  };

  const promptText =
    part.input && "prompt" in part.input
      ? String(part.input.prompt)
      : "Sub-agent task";
  const promptSummary =
    promptText.length > 80 ? `${promptText.slice(0, 77)}...` : promptText;

  return (
    <Tool defaultOpen={displayStatus === "running"} key={part.state}>
      <ToolHeader
        state={part.state}
        title={`Sub-agent${isBackground ? " (background)" : ""}`}
        type={part.type as "tool-call"}
      />
      <ToolContent>
        <div className="space-y-3 p-4">
          <p className="text-muted-foreground text-sm">{promptSummary}</p>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${statusColors[displayStatus] ?? ""}`}
            >
              {displayStatus}
            </span>

            {childChatId && (
              <Button onClick={handleViewThread} size="sm" variant="outline">
                View thread
              </Button>
            )}
          </div>

          {/* Show output for foreground completed */}
          {output?.success &&
            "output" in output &&
            output.mode === "foreground" && (
              <ToolOutput errorText={undefined} output={output.output} />
            )}

          {/* Show error */}
          {output && !output.success && (
            <ToolOutput errorText={output.error} output={null} />
          )}
        </div>
      </ToolContent>
    </Tool>
  );
});
