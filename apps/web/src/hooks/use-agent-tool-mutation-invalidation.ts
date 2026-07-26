"use client";

import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { type DynamicToolUIPart, isToolUIPart, type ToolUIPart } from "ai";
import { useEffect, useRef } from "react";
import type { OrgChatMessage } from "@/components/chat/dock/chat-tabs-store";
import { getToolName } from "@/components/chat/tools/tool-registry";
import {
  AGENT_TOOL_INVALIDATION_REGISTRY,
  type AgentAppliedWrite,
  invalidateForAgentWrite,
} from "@/lib/agent-tool-invalidation-registry";

function isRegisteredWrite(method: string | undefined): method is string {
  return Boolean(method && method in AGENT_TOOL_INVALIDATION_REGISTRY);
}

function isWriteToolPart(part: OrgChatMessage["parts"][number]): part is (
  | ToolUIPart
  | DynamicToolUIPart
) & {
  toolCallId: string;
  state: string;
  input?: unknown;
  output?: unknown;
} {
  if (!(part.type === "dynamic-tool" || isToolUIPart(part))) {
    return false;
  }
  if (!isRegisteredWrite(getToolName(part))) {
    return false;
  }
  return typeof part.toolCallId === "string" && part.toolCallId.length > 0;
}

function isSuccessfulToolOutput(output: unknown): boolean {
  if (!output || typeof output !== "object") {
    return true;
  }
  if ("ok" in output && (output as { ok: unknown }).ok === false) {
    return false;
  }
  return true;
}

export interface WriteToolCompletionEvent {
  toolCallId: string;
  writes: AgentAppliedWrite[];
}

/**
 * Scan assistant message tool parts for successful top-level write tools.
 * Pure helper — exported for unit tests.
 */
export function collectWriteToolCompletionEvents(
  messages: OrgChatMessage[],
  alreadyHandled: ReadonlySet<string>
): WriteToolCompletionEvent[] {
  const events: WriteToolCompletionEvent[] = [];

  for (const message of messages) {
    if (message.role !== "assistant") {
      continue;
    }
    for (const part of message.parts) {
      if (!isWriteToolPart(part)) {
        continue;
      }
      if (alreadyHandled.has(part.toolCallId)) {
        continue;
      }
      if (part.state !== "output-available") {
        continue;
      }
      if (!isSuccessfulToolOutput(part.output)) {
        continue;
      }
      const method = getToolName(part);
      events.push({
        toolCallId: part.toolCallId,
        writes: [{ method, args: part.input }],
      });
    }
  }

  return events;
}

/**
 * Invalidate React Query for completed write-tool events. Exported for unit tests.
 */
export function applyWriteToolCompletionInvalidations(options: {
  events: WriteToolCompletionEvent[];
  handled?: Set<string>;
  queryClient: QueryClient;
}): void {
  const handled = options.handled ?? new Set<string>();
  for (const event of options.events) {
    if (handled.has(event.toolCallId)) {
      continue;
    }
    handled.add(event.toolCallId);
    for (const write of event.writes) {
      invalidateForAgentWrite(options.queryClient, write);
    }
  }
}

/**
 * Watch `messages` for successful agent write tools and invalidate matching
 * React Query keys. Write tools are top-level (`create_product`, …); approval
 * gates pause with AI SDK `approval-requested` until the user responds.
 */
export function useAgentToolMutationInvalidation(options: {
  messages: OrgChatMessage[];
}) {
  const { messages } = options;
  const queryClient = useQueryClient();
  const handledRef = useRef(new Set<string>());

  // biome-ignore lint/plugin/no-use-effect: invalidate react-query when write tool parts complete
  useEffect(() => {
    const events = collectWriteToolCompletionEvents(
      messages,
      handledRef.current
    );
    if (events.length === 0) {
      return;
    }

    applyWriteToolCompletionInvalidations({
      events,
      handled: handledRef.current,
      queryClient,
    });
  }, [messages, queryClient]);
}
