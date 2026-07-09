"use client";

import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@workspace/ui/components/ai-elements/tool";
import type { DynamicToolUIPart, ToolUIPart } from "ai";
import { useEffect, useState } from "react";
import { useChatConnection } from "@/components/chat/window/chat-window";
import { idToReadableText } from "@/lib/id-to-readable-text";

const METHOD_SPLIT = /[_-]/;

interface PendingAction {
  method?: string;
  args?: unknown;
}

interface CodemodeOutput {
  status: "paused" | "completed" | "rejected" | "error";
  executionId: string;
  pending?: PendingAction[];
  result?: unknown;
  error?: string;
  reason?: string;
}

function asCodemodeOutput(value: unknown): CodemodeOutput | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const o = value as Record<string, unknown>;
  if (typeof o.executionId !== "string" || typeof o.status !== "string") {
    return null;
  }
  if (
    o.status !== "paused" &&
    o.status !== "completed" &&
    o.status !== "rejected" &&
    o.status !== "error"
  ) {
    return null;
  }
  return o as unknown as CodemodeOutput;
}

function humanizeMethod(method: string | undefined): string {
  if (!method) {
    return "Codemode";
  }
  return method
    .split(METHOD_SPLIT)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function toolStateForStatus(
  status: CodemodeOutput["status"]
): ToolUIPart["state"] {
  if (status === "paused") {
    return "approval-requested";
  }
  if (status === "rejected") {
    return "output-denied";
  }
  if (status === "error") {
    return "output-error";
  }
  return "output-available";
}

export function PausedExecutionCard({
  part,
}: {
  part: ToolUIPart | DynamicToolUIPart;
}) {
  const { callAgent } = useChatConnection();
  const output = asCodemodeOutput(part.output);
  const status = output?.status;
  const executionId = output?.executionId;

  // Keep this card mounted after Approve (completed output looks like any
  // other codemode run). Session-only — reload of an approved run is generic.
  const [wasGated, setWasGated] = useState(false);
  const [action, setAction] = useState<PendingAction | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === "paused") {
      setWasGated(true);
      if (output?.pending?.length) {
        setAction(output.pending[0] ?? null);
      }
    }
    if (status === "rejected") {
      setWasGated(true);
    }
  }, [status, output]);

  const gated = wasGated || status === "paused" || status === "rejected";

  if (!gated) {
    return (
      <Tool defaultOpen={false}>
        <ToolHeader
          state={part.state}
          title={idToReadableText("codemode", { capitalize: true })}
          type="tool-codemode"
        />
        <ToolContent>
          <ToolInput input={part.input} />
          <ToolOutput errorText={part.errorText} output={part.output} />
        </ToolContent>
      </Tool>
    );
  }

  if (!(output && status && executionId)) {
    return null;
  }

  const title = humanizeMethod(action?.method);
  const argsPreview = action?.args ?? null;

  async function onApprove() {
    if (!executionId || busy) {
      return;
    }
    setBusy(true);
    try {
      await callAgent("approveExecution", [executionId]);
    } finally {
      setBusy(false);
    }
  }

  async function onReject() {
    if (!executionId || busy) {
      return;
    }
    setBusy(true);
    try {
      await callAgent("rejectExecution", [executionId]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Tool defaultOpen={status === "paused"}>
      <ToolHeader
        state={toolStateForStatus(status)}
        title={title}
        type="tool-codemode"
      />
      <ToolContent>
        {status === "paused" ? (
          <div className="space-y-3 p-4">
            <p className="text-muted-foreground text-sm">
              This action needs your approval before it runs.
            </p>
            {argsPreview != null ? (
              <ToolInput className="p-0" input={argsPreview} />
            ) : null}
            <div className="flex gap-2">
              <button
                className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground text-sm disabled:opacity-50"
                disabled={busy}
                onClick={() => {
                  onApprove().catch(() => undefined);
                }}
                type="button"
              >
                {busy ? "Working…" : "Approve"}
              </button>
              <button
                className="rounded-md border px-3 py-1.5 font-medium text-sm disabled:opacity-50"
                disabled={busy}
                onClick={() => {
                  onReject().catch(() => undefined);
                }}
                type="button"
              >
                Reject
              </button>
            </div>
          </div>
        ) : null}

        {status === "completed" ? (
          <ToolOutput
            errorText={undefined}
            output={output.result ?? { status: "completed", executionId }}
          />
        ) : null}

        {status === "rejected" ? (
          <ToolOutput
            errorText={output.reason ?? output.error ?? "Rejected by user"}
            output={undefined}
          />
        ) : null}

        {status === "error" ? (
          <ToolOutput
            errorText={output.error ?? "Execution failed"}
            output={undefined}
          />
        ) : null}
      </ToolContent>
    </Tool>
  );
}
