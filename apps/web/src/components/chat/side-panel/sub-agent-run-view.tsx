"use client";

import { useAgentChat } from "@cloudflare/think/react";
import { useAgent } from "agents/react";
import { BotIcon } from "lucide-react";
import { useChatOrgConnection } from "@/components/chat/connection/chat-org-connection";
import type {
  ActiveSubAgentRun,
  OrgChatMessage,
} from "@/components/chat/dock/chat-tabs-store";
import { ChatMessages } from "@/components/chat/parts/chat-messages";
import { ChatConnectionContext } from "@/components/chat/window/chat-window";

/**
 * ALW-401 — the "Runs" tab of the expanded-window Inspector: a delegated
 * sub-agent's full transcript, live and **view-only** (no composer — you talk to
 * the parent, the parent delegates). It opens a *second* WebSocket straight to
 * the child facet (`OrgAgent → OrgChat → OrgSubAgent`), so it sees the child's
 * own resumable stream: text, reasoning, and its read-only tool calls, rendered
 * through the same `<ChatMessages>` pipeline as a top-level chat. The
 * `/agents/org-agent/:id` gate covers this `/sub/...` path, so no extra auth.
 *
 * If we ever want to converse *with* a sub-agent directly, this is where a
 * composer would mount — the connection already supports sending.
 */
const noop = () => {
  // view-only: no retry/send affordances
};

function RunConnection({ run }: { run: ActiveSubAgentRun }) {
  const { organizationId } = useChatOrgConnection();

  const childAgent = useAgent({
    agent: "OrgAgent",
    name: organizationId,
    sub: [
      { agent: "OrgChat", name: run.chatId },
      { agent: "OrgSubAgent", name: run.runId },
    ],
  });

  const helpers = useAgentChat<unknown, OrgChatMessage>({
    agent: childAgent,
    getInitialMessages: null,
    experimental_throttle: 100,
  });

  const isHydrating = !(childAgent.identified || childAgent.connectionError);

  return (
    <ChatConnectionContext.Provider
      value={{
        callAgent: () =>
          Promise.reject(new Error("Sub-agent view is read-only")),
        getSubAgentRuns: () => [],
        helpers,
      }}
    >
      <ChatMessages
        helpers={helpers}
        isHydrating={isHydrating}
        onRetry={noop}
        pending={null}
        sendError={null}
      />
    </ChatConnectionContext.Provider>
  );
}

export function SubAgentRunView({ run }: { run: ActiveSubAgentRun | null }) {
  if (!run) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <BotIcon className="size-6 text-muted-foreground" />
        <p className="font-medium text-sm">No sub-agent selected</p>
        <p className="max-w-xs text-muted-foreground text-xs">
          Open one from a “Sub-agent” card in the conversation to watch its full
          run here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b px-3 py-2">
        <div className="flex items-center gap-2 text-sm">
          <BotIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate font-medium">{run.title}</span>
        </div>
        <p className="mt-0.5 text-muted-foreground text-xs">
          Read-only view of this sub-agent's run.
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {/* Remount on run change so the child socket points at the new facet. */}
        <RunConnection key={run.runId} run={run} />
      </div>
    </div>
  );
}
