import type { AIDataPart, AIMetadata } from "@workspace/types/ai";
import type { ToolUIPart, UIMessage } from "ai";
import type { AITools } from "@/lib/ai/tools/registry";

export type AIToolUIPart = ToolUIPart<AITools>;

export type AIUIMessage = UIMessage<AIMetadata, AIDataPart, AITools>;
