"use client";

import {
  codemodeDisplayStatus,
  codemodeFailureMessage,
} from "@workspace/agent/codemode-output";
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
import {
  asCodemodeOutput,
  type CodemodeOutput,
  type CodemodePendingAction,
} from "@/lib/codemode-output";
import { idToReadableText } from "@/lib/id-to-readable-text";
import { toolSectionLabels, toolStatusLabels } from "@/lib/tool-labels";
import { m } from "@/paraglide/messages.js";

const METHOD_SPLIT = /[_-]/;

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
  const statusLabels = toolStatusLabels();
  const sections = toolSectionLabels();

  // Keep this card mounted after Approve (completed output looks like any
  // other codemode run). Session-only — reload of an approved run is generic.
  const [wasGated, setWasGated] = useState(false);
  const [action, setAction] = useState<CodemodePendingAction | null>(null);
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
          statusLabels={statusLabels}
          title={idToReadableText("codemode", { capitalize: true })}
          type="tool-codemode"
        />
        <ToolContent>
          <ToolInput input={part.input} parametersLabel={sections.parameters} />
          <ToolOutput
            errorLabel={sections.error}
            errorText={part.errorText}
            output={part.output}
            resultLabel={sections.result}
          />
        </ToolContent>
      </Tool>
    );
  }

  if (!(output && status && executionId)) {
    return null;
  }

  const title = humanizeMethod(action?.method);
  const argsPreview = action?.args ?? null;
  const displayStatus = codemodeDisplayStatus(status, output.result);
  const failureMessage = codemodeFailureMessage(output.result);
  const errorText =
    displayStatus === "error"
      ? (output.error ?? failureMessage ?? m.tool_execution_failed())
      : undefined;

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
        state={toolStateForStatus(displayStatus)}
        statusLabels={statusLabels}
        title={title}
        type="tool-codemode"
      />
      <ToolContent>
        {status === "paused" ? (
          <div className="space-y-3 p-4">
            <p className="text-muted-foreground text-sm">
              {m.tool_approval_needed()}
            </p>
            {argsPreview == null ? null : (
              <ToolInput
                className="p-0"
                input={argsPreview}
                parametersLabel={sections.parameters}
              />
            )}
            <div className="flex gap-2">
              <button
                className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground text-sm disabled:opacity-50"
                disabled={busy}
                onClick={() => {
                  onApprove().catch(() => undefined);
                }}
                type="button"
              >
                {busy ? m.tool_working() : m.tool_approve()}
              </button>
              <button
                className="rounded-md border px-3 py-1.5 font-medium text-sm disabled:opacity-50"
                disabled={busy}
                onClick={() => {
                  onReject().catch(() => undefined);
                }}
                type="button"
              >
                {m.tool_reject()}
              </button>
            </div>
          </div>
        ) : null}

        {displayStatus === "completed" ? (
          <ToolOutput
            errorLabel={sections.error}
            errorText={undefined}
            output={output.result ?? { status: "completed", executionId }}
            resultLabel={sections.result}
          />
        ) : null}

        {displayStatus === "rejected" ? (
          <ToolOutput
            errorLabel={sections.error}
            errorText={
              output.reason ?? output.error ?? m.tool_rejected_by_user()
            }
            output={undefined}
            resultLabel={sections.result}
          />
        ) : null}

        {displayStatus === "error" ? (
          <ToolOutput
            errorLabel={sections.error}
            errorText={errorText}
            output={undefined}
            resultLabel={sections.result}
          />
        ) : null}
      </ToolContent>
    </Tool>
  );
}
