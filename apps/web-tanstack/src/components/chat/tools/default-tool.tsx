import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@workspace/ui/components/ai-elements/tool";
import { Button } from "@workspace/ui/components/shadcn/button";
import type { DynamicToolUIPart, ToolUIPart } from "ai";
import { memo } from "react";
import { useChatConnection } from "@/components/chat/window/chat-window";
import { idToReadableText } from "@/lib/id-to-readable-text";

export interface DefaultToolProps {
  part: ToolUIPart | DynamicToolUIPart;
}

export const DefaultTool = memo(({ part }: DefaultToolProps) => {
  const toolName =
    "toolName" in part && typeof part.toolName === "string"
      ? part.toolName
      : part.type.slice(5);

  return (
    <Tool defaultOpen={part.state === "approval-requested"} key={part.state}>
      <ToolHeader
        state={part.state}
        title={idToReadableText(toolName, { capitalize: true })}
        type={`tool-${toolName}` as ToolUIPart["type"]}
      />
      <ToolContent>
        <ToolInput input={part.input} />
        {part.state === "approval-requested" && <ToolApproval part={part} />}
        <ToolOutput errorText={part.errorText} output={part.output} />
      </ToolContent>
    </Tool>
  );
});

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
