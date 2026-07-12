"use client";

import { Tool, ToolContent } from "@workspace/ui/components/ai-elements/tool";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import { Button } from "@workspace/ui/components/shadcn/button";
import { CollapsibleTrigger } from "@workspace/ui/components/shadcn/collapsible";
import { useIsMobile } from "@workspace/ui/hooks/use-mobile";
import { cn } from "@workspace/ui/lib/utils";
import {
  BotIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  LoaderIcon,
  OctagonAlertIcon,
  PanelRightIcon,
  XCircleIcon,
} from "lucide-react";
import { memo, type ReactNode } from "react";
import { Streamdown } from "streamdown";
import { useChatOrgConnection } from "@/components/chat/connection/chat-org-connection";
import { useChatTabsStore } from "@/components/chat/dock/chat-tabs-store";
import { MessagePart } from "@/components/chat/parts/message-part";
import {
  type SubAgentRun,
  useChatConnection,
  useChatWindow,
} from "@/components/chat/window/chat-window";
import { idToReadableText } from "@/lib/id-to-readable-text";
import { m } from "@/paraglide/messages.js";
import type { ToolRenderProps } from "./tool-registry";

/**
 * ALW-401 — inline renderer for the `delegate` sub-agent tool (Layer 1 of the
 * sub-agent UX). A delegated `OrgSubAgent` runs in its own context window; the
 * parent socket re-broadcasts its transcript as `agent-tool-event` frames, which
 * `useAgentToolEvents` folds into a `SubAgentRun` (see chat-window.tsx). This
 * card renders that run live and in place — collapsed it shows a status badge +
 * the current activity line; expanded it replays the child's own parts (text,
 * reasoning, its read-only tool cards) through the same `<MessagePart>` pipeline
 * as a normal message, so you watch it work instead of staring at a spinner.
 *
 * Full drill-in (the child as a complete chat in the fullscreen side panel) is
 * Layer 2 and rides the same data; this card is the always-on default and needs
 * no extra connection.
 */

type Status = SubAgentRun["status"] | "pending";

function statusMeta(status: Status): { label: string; icon: ReactNode } {
  switch (status) {
    case "completed":
      return {
        label: m.tool_delegate_completed(),
        icon: <CheckCircleIcon className="size-3.5 text-green-600" />,
      };
    case "error":
      return {
        label: m.tool_delegate_error(),
        icon: <XCircleIcon className="size-3.5 text-red-600" />,
      };
    case "aborted":
      return {
        label: m.tool_delegate_aborted(),
        icon: <XCircleIcon className="size-3.5 text-muted-foreground" />,
      };
    case "interrupted":
      return {
        label: m.tool_delegate_interrupted(),
        icon: <OctagonAlertIcon className="size-3.5 text-amber-600" />,
      };
    default:
      return {
        label: m.tool_delegate_working(),
        icon: (
          <LoaderIcon className="size-3.5 animate-spin text-muted-foreground" />
        ),
      };
  }
}

function getTask(input: unknown): string {
  if (input && typeof input === "object" && "task" in input) {
    const task = (input as { task?: unknown }).task;
    if (typeof task === "string") {
      return task;
    }
  }
  return "";
}

/**
 * A one-line "what is it doing right now" summary, read from the tail of the
 * child's parts: its latest tool call, a reasoning burst, or its latest text.
 */
function deriveActivity(run: SubAgentRun | undefined): string | null {
  if (!run) {
    return null;
  }
  if (run.progress?.message) {
    return run.progress.message;
  }
  for (let i = run.parts.length - 1; i >= 0; i--) {
    const subPart = run.parts[i];
    if (!subPart) {
      continue;
    }
    if (subPart.type === "dynamic-tool" || subPart.type.startsWith("tool-")) {
      const name =
        "toolName" in subPart && typeof subPart.toolName === "string"
          ? subPart.toolName
          : subPart.type.slice(5);
      return `Using ${idToReadableText(name)}…`;
    }
    if (subPart.type === "reasoning") {
      return "Thinking…";
    }
    if (subPart.type === "text" && subPart.text.trim()) {
      const text = subPart.text.trim();
      return text.length > 80 ? `${text.slice(0, 80)}…` : text;
    }
  }
  return null;
}

export const DelegateRun = memo(({ part }: ToolRenderProps) => {
  const { getSubAgentRuns } = useChatConnection();
  const { chatId, tabKey } = useChatWindow();
  const { organizationId } = useChatOrgConnection();
  const isMobile = useIsMobile();
  const { toolCallId } = part;
  // A retried tool call can spawn more than one run under the same id; the last
  // is the live/most-recent one.
  const run = getSubAgentRuns(toolCallId).at(-1);

  const task = getTask(part.input);
  const label = run?.display?.name ?? "Sub-agent";

  // Drill-in needs a started child facet (`run`) and a real parent chat; the
  // full-transcript panel is desktop-only (mobile uses the inline expand).
  const canOpen = Boolean(run && chatId) && !isMobile;
  const handleOpen = () => {
    if (!(run && chatId)) {
      return;
    }
    useChatTabsStore.getState().openSubAgentRun(organizationId, tabKey, {
      chatId,
      runId: run.subAgent.name,
      title: task || label,
      toolCallId,
    });
  };

  let status: Status;
  if (run) {
    status = run.status;
  } else if (part.state === "output-available") {
    status = "completed";
  } else if (part.state === "output-error") {
    status = "error";
  } else {
    status = "pending";
  }
  const running = status === "pending" || status === "running";
  const meta = statusMeta(status);
  const activity = running ? deriveActivity(run) : null;

  const parts = run?.parts ?? [];
  // Fallback for a resume gap / pre-stream state where we have the final summary
  // (or the tool's own output) but not the reconstructed parts.
  const summary =
    run?.summary ?? (typeof part.output === "string" ? part.output : undefined);
  const errorText =
    run?.error ?? (part.state === "output-error" ? part.errorText : undefined);

  return (
    <Tool defaultOpen={running}>
      <div className="flex items-start gap-1 p-3">
        <CollapsibleTrigger className="group flex min-w-0 flex-1 items-start gap-2 text-left">
          <BotIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{label}</span>
              <Badge className="gap-1 rounded-full text-xs" variant="secondary">
                {meta.icon}
                {meta.label}
              </Badge>
            </div>
            {task && (
              <p className="mt-0.5 truncate text-muted-foreground text-xs">
                {task}
              </p>
            )}
            {activity && (
              <p className="mt-0.5 truncate text-muted-foreground text-xs">
                ↳ {activity}
              </p>
            )}
          </div>
        </CollapsibleTrigger>
        {canOpen && (
          <Button
            className="h-7 shrink-0 gap-1 px-2 text-xs"
            onClick={handleOpen}
            size="sm"
            type="button"
            variant="ghost"
          >
            <PanelRightIcon className="size-3.5" />
            Open
          </Button>
        )}
        <CollapsibleTrigger
          aria-label="Toggle sub-agent details"
          className="group mt-0.5 shrink-0"
        >
          <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
      </div>
      <ToolContent>
        <div className="border-t px-3 py-2">
          <DelegateBody
            id={run?.runId ?? toolCallId}
            parts={parts}
            running={running}
            summary={summary}
          />
          {errorText && (
            <div className="mt-2 rounded-md bg-destructive/10 px-3 py-2 text-destructive text-xs">
              {errorText}
            </div>
          )}
        </div>
      </ToolContent>
    </Tool>
  );
});

DelegateRun.displayName = "DelegateRun";

function DelegateBody({
  id,
  parts,
  running,
  summary,
}: {
  id: string;
  parts: SubAgentRun["parts"];
  running: boolean;
  summary: string | undefined;
}) {
  if (parts.length > 0) {
    return (
      <div className="flex flex-col gap-1">
        {parts.map((subPart, index) => (
          <MessagePart
            isLastPart={index === parts.length - 1}
            isLoading={running}
            // biome-ignore lint/suspicious/noArrayIndexKey: streamed sub-agent parts have no stable id
            key={`${id}-part-${index}`}
            messageId={id}
            part={subPart}
            partIndex={index}
          />
        ))}
      </div>
    );
  }
  if (summary) {
    return (
      <Streamdown
        className={cn(
          "size-full text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
        )}
      >
        {summary}
      </Streamdown>
    );
  }
  return (
    <p className="py-1 text-muted-foreground text-xs">
      {running ? "Starting sub-agent…" : "No activity recorded."}
    </p>
  );
}
