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
import { toolSectionLabels, toolStatusLabels } from "@/lib/tool-labels";
import { m } from "@/paraglide/messages.js";

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
  const statusLabels = toolStatusLabels();
  const sections = toolSectionLabels();

  return (
    <Tool defaultOpen={part.state === "approval-requested"} key={part.state}>
      <ToolHeader
        state={part.state}
        statusLabels={statusLabels}
        title={idToReadableText(toolName, { capitalize: true })}
        type={`tool-${toolName}` as ToolUIPart["type"]}
      />
      <ToolContent>
        <ToolInput input={part.input} parametersLabel={sections.parameters} />
        {part.state === "approval-requested" && <ToolApproval part={part} />}
        {denied ? (
          <PermissionDeniedNote />
        ) : (
          <ToolOutput
            errorLabel={sections.error}
            errorText={part.errorText}
            output={part.output}
            resultLabel={sections.result}
          />
        )}
      </ToolContent>
    </Tool>
  );
});

function PermissionDeniedNote() {
  return (
    <div className="flex items-start gap-2 p-4 text-muted-foreground text-sm">
      <LockIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{m.tool_permission_denied()}</span>
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
        {m.tool_approve()}
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
        {m.tool_reject()}
      </Button>
    </div>
  );
}
