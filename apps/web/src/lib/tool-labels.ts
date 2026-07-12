import type { ToolStatusLabels } from "@workspace/ui/components/ai-elements/tool";
import { m } from "@/paraglide/messages.js";

/** Localized status badge labels for `ToolHeader`. */
export function toolStatusLabels(): ToolStatusLabels {
  return {
    "input-streaming": m.tool_status_pending(),
    "input-available": m.tool_status_running(),
    "approval-requested": m.tool_status_approval_requested(),
    "approval-responded": m.tool_status_approval_responded(),
    "output-available": m.tool_status_completed(),
    "output-error": m.tool_status_error(),
    "output-denied": m.tool_status_denied(),
  };
}

export function toolSectionLabels() {
  return {
    parameters: m.tool_parameters(),
    result: m.tool_result(),
    error: m.tool_error(),
  };
}
