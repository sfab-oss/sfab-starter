"use client";

import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { isToolUIPart } from "ai";
import { useEffect, useRef } from "react";
import type { OrgChatMessage } from "@/components/chat/dock/chat-tabs-store";
import { getToolName } from "@/components/chat/tools/tool-registry";
import {
  AGENT_TOOL_INVALIDATION_REGISTRY,
  type AgentAppliedWrite,
  invalidateForAgentWrite,
} from "@/lib/agent-tool-invalidation-registry";
import {
  asCodemodeOutput,
  type CodemodeOutput,
  type CodemodePendingAction,
} from "@/lib/codemode-output";

function isRegisteredWrite(method: string | undefined): method is string {
  return Boolean(method && method in AGENT_TOOL_INVALIDATION_REGISTRY);
}

function writesFromPending(
  pending: CodemodePendingAction[] | undefined
): AgentAppliedWrite[] {
  if (!pending?.length) {
    return [];
  }
  const out: AgentAppliedWrite[] = [];
  for (const action of pending) {
    if (!isRegisteredWrite(action.method)) {
      continue;
    }
    out.push({ method: action.method, args: action.args });
  }
  return out;
}

function writesFromApplied(
  appliedWrites: CodemodeOutput["appliedWrites"]
): AgentAppliedWrite[] {
  if (!appliedWrites?.length) {
    return [];
  }
  const out: AgentAppliedWrite[] = [];
  for (const write of appliedWrites) {
    if (!isRegisteredWrite(write.method)) {
      continue;
    }
    out.push({ method: write.method, args: write.args });
  }
  return out;
}

function isCodemodeToolPart(
  part: OrgChatMessage["parts"][number]
): part is OrgChatMessage["parts"][number] & {
  toolCallId: string;
  state: string;
  output?: unknown;
} {
  if (!(part.type === "dynamic-tool" || isToolUIPart(part))) {
    return false;
  }
  if (getToolName(part) !== "codemode") {
    return false;
  }
  return typeof part.toolCallId === "string" && part.toolCallId.length > 0;
}

function isTerminalToolState(state: string): boolean {
  return (
    state === "output-available" ||
    state === "output-error" ||
    state === "output-denied"
  );
}

/**
 * Resolve writes for a completed codemode output: `appliedWrites` from the
 * server, then `pending` on the output, then paused-cache for that toolCallId.
 */
export function resolveCodemodeWrites(
  output: CodemodeOutput,
  toolCallId: string,
  pausedWritesByToolCall: ReadonlyMap<string, AgentAppliedWrite[]>
): AgentAppliedWrite[] {
  const fromApplied = writesFromApplied(output.appliedWrites);
  if (fromApplied.length > 0) {
    return fromApplied;
  }
  const fromPending = writesFromPending(output.pending);
  if (fromPending.length > 0) {
    return fromPending;
  }
  return pausedWritesByToolCall.get(toolCallId) ?? [];
}

/**
 * Cache pending write methods while a codemode run is paused for approval
 * (delete_product path). When the same toolCallId later completes, those
 * methods are available even if appliedWrites is absent on the output.
 */
export function collectCodemodePausedWrites(
  messages: OrgChatMessage[]
): Map<string, AgentAppliedWrite[]> {
  const map = new Map<string, AgentAppliedWrite[]>();
  for (const message of messages) {
    if (message.role !== "assistant") {
      continue;
    }
    for (const part of message.parts) {
      if (!isCodemodeToolPart(part)) {
        continue;
      }
      const output = asCodemodeOutput(part.output);
      if (output?.status !== "paused") {
        continue;
      }
      const writes = writesFromPending(output.pending);
      if (writes.length > 0) {
        map.set(part.toolCallId, writes);
      }
    }
  }
  return map;
}

export interface CodemodeCompletionEvent {
  toolCallId: string;
  writes: AgentAppliedWrite[];
}

/**
 * Scan assistant message tool parts for completed mutating codemode runs.
 * Pure helper — exported for unit tests.
 */
export function collectCodemodeCompletionEvents(
  messages: OrgChatMessage[],
  alreadyHandled: ReadonlySet<string>,
  pausedWritesByToolCall: ReadonlyMap<string, AgentAppliedWrite[]> = new Map()
): CodemodeCompletionEvent[] {
  const events: CodemodeCompletionEvent[] = [];

  for (const message of messages) {
    if (message.role !== "assistant") {
      continue;
    }
    for (const part of message.parts) {
      if (!isCodemodeToolPart(part)) {
        continue;
      }
      if (alreadyHandled.has(part.toolCallId)) {
        continue;
      }
      if (!isTerminalToolState(part.state)) {
        continue;
      }
      const output = asCodemodeOutput(part.output);
      if (output?.status !== "completed") {
        continue;
      }
      events.push({
        toolCallId: part.toolCallId,
        writes: resolveCodemodeWrites(
          output,
          part.toolCallId,
          pausedWritesByToolCall
        ),
      });
    }
  }

  return events;
}

/**
 * Invalidate React Query for completed codemode events. Exported for unit tests.
 */
export function applyCodemodeCompletionInvalidations(options: {
  events: CodemodeCompletionEvent[];
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
 * React Query keys. Codemode inner tools never appear as separate parts —
 * writes come from `appliedWrites` on completed output, `pending` on the
 * output, or cached paused pending for approve-gated deletes.
 */
export function useAgentToolMutationInvalidation(options: {
  messages: OrgChatMessage[];
}) {
  const { messages } = options;
  const queryClient = useQueryClient();
  const handledRef = useRef(new Set<string>());
  const pausedWritesRef = useRef(new Map<string, AgentAppliedWrite[]>());

  // biome-ignore lint/plugin/no-use-effect: external sync — revisit per code-smells.md (ALW-672)
  useEffect(() => {
    const paused = collectCodemodePausedWrites(messages);
    for (const [toolCallId, writes] of paused) {
      pausedWritesRef.current.set(toolCallId, writes);
    }

    const events = collectCodemodeCompletionEvents(
      messages,
      handledRef.current,
      pausedWritesRef.current
    );
    if (events.length === 0) {
      return;
    }

    applyCodemodeCompletionInvalidations({
      events,
      handled: handledRef.current,
      queryClient,
    });

    for (const event of events) {
      pausedWritesRef.current.delete(event.toolCallId);
    }
  }, [messages, queryClient]);
}
