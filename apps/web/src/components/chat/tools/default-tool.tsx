import { PERMISSION_DENIED_MESSAGE } from "@workspace/agent/constants";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@workspace/ui/components/ai-elements/tool";
import { Button } from "@workspace/ui/components/shadcn/button";
import type { DynamicToolUIPart, ToolUIPart } from "ai";
import { LockIcon } from "lucide-react";
import { memo } from "react";
import { useChatConnection } from "@/components/chat/window/chat-window";
import { idToReadableText } from "@/lib/id-to-readable-text";

export interface DefaultToolProps {
  part: ToolUIPart | DynamicToolUIPart;
}

/**
 * A role-denied write tool throws the RBAC guard's `PERMISSION_DENIED_MESSAGE`,
 * which arrives here as `errorText` on an errored part. We treat that as an
 * expected, benign outcome — a calm "not permitted" note — rather than the red
 * error block a real tool failure gets (ALW-401 AC-3).
 */
function isPermissionDenied(part: ToolUIPart | DynamicToolUIPart): boolean {
  return (
    part.state === "output-error" &&
    part.errorText === PERMISSION_DENIED_MESSAGE
  );
}

export const DefaultTool = memo(({ part }: DefaultToolProps) => {
  const toolName =
    "toolName" in part && typeof part.toolName === "string"
      ? part.toolName
      : part.type.slice(5);

  const denied = isPermissionDenied(part);

  return (
    <Tool defaultOpen={part.state === "approval-requested"} key={part.state}>
      <ToolHeader
        state={part.state}
        title={idToReadableText(toolName, { capitalize: true })}
        type={`tool-${toolName}` as ToolUIPart["type"]}
      />
      <ToolContent>
        <ToolInput input={part.input} />
        {/* Human-approval prompt (ALW-348). Live for top-level tools that set
            `needsApproval` — currently `delete-product`. `addToolApprovalResponse`
            resolves the paused call; on approve the tool's `execute` runs (still
            RBAC-gated). See docs/guides/agent-tool-approvals.md. */}
        {part.state === "approval-requested" && <ToolApproval part={part} />}
        {denied ? (
          <PermissionDeniedNote />
        ) : (
          <ToolOutput errorText={part.errorText} output={part.output} />
        )}
      </ToolContent>
    </Tool>
  );
});

function PermissionDeniedNote() {
  return (
    <div className="flex items-start gap-2 p-4 text-muted-foreground text-sm">
      <LockIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>
        Your role doesn't allow this action, so it wasn't performed. Ask an
        admin or owner if you need it done.
      </span>
    </div>
  );
}

function ToolApproval({ part }: { part: ToolUIPart | DynamicToolUIPart }) {
  const { helpers } = useChatConnection();
  if (part.state !== "approval-requested") {
    return null;
  }
  return (
    <div className="flex gap-2 px-4 pb-4">
      <Button
        onClick={() =>
          helpers.addToolApprovalResponse({
            id: part.approval.id,
            approved: true,
          })
        }
      >
        Approve
      </Button>
      <Button
        onClick={() =>
          helpers.addToolApprovalResponse({
            id: part.approval.id,
            approved: false,
          })
        }
        variant="destructive"
      >
        Reject
      </Button>
    </div>
  );
}
