import type { AIDataPart, AIMetadata } from "@workspace/types/ai";
import type { UIMessage } from "ai";
import type { AITools } from "@/lib/ai/tools/registry";

export type AIUIMessage = UIMessage<AIMetadata, AIDataPart, AITools>;
