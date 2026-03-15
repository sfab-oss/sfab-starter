import type { ChatContext } from "@workspace/types/ai";
import { convertToModelMessages, gateway, stepCountIs, streamText } from "ai";
import { createId } from "@/lib/utils";
import type { AIUIMessage } from "@/types/ai";
import { type AgentId, getAgent } from "./agents";
import { getAiTools } from "./tools";
import {
  buildCompactedMessages,
  compactMessages,
  createSummarizer,
  resolveCompactionBoundary,
  shouldCompact,
} from "./utils/context/compaction";
import {
  createDoomLoopWarningMessage,
  detectDoomLoop,
} from "./utils/context/doom-loop";
import { formatErrorForUser } from "./utils/context/error-recovery";
import {
  buildInitialActiveTools,
  handleSkillToolResults,
} from "./utils/skill-service";

export async function agentRespond({
  messages: allMessages,
  onUpsertMessage,
  abortSignal,
  orgId,
  agentId,
  context,
}: {
  messages: AIUIMessage[];
  onUpsertMessage: (message: AIUIMessage) => Promise<void>;
  abortSignal: AbortSignal;
  orgId: string;
  agentId: AgentId;
  context: ChatContext;
}) {
  const startTime = Date.now();

  const { messages: initialMessages, summaryText } =
    resolveCompactionBoundary(allMessages);

  const agent = getAgent(agentId);

  const systemPrompt = agent.systemPrompt(
    context,
    agent.skills.availableCalled
  );

  const tools = getAiTools(orgId);

  let activeTools = buildInitialActiveTools(agent, initialMessages);

  const providerOptions = agent.model.providerOptions;
  const modelId = agent.model.modelId;
  const contextLimit = 1_000_000;
  const summarize = createSummarizer(gateway(modelId));
  let compactionSummary: string | null = summaryText;

  const streamResult = streamText({
    model: gateway(modelId),
    providerOptions,
    system: systemPrompt,
    messages: await convertToModelMessages(initialMessages),
    abortSignal,
    tools,
    stopWhen: stepCountIs(25),
    activeTools: Array.from(activeTools),
    prepareStep: async ({ steps, messages: currentMessages }) => {
      const lastStep = steps.at(-1);
      if (lastStep && lastStep.toolResults.length > 0) {
        activeTools = handleSkillToolResults(lastStep.toolResults, activeTools);
      }

      // Doom loop detection
      if (detectDoomLoop(steps)) {
        return {
          activeTools: Array.from(activeTools),
          messages: [...currentMessages, createDoomLoopWarningMessage()],
        };
      }

      // Compaction check
      if (shouldCompact(steps, contextLimit)) {
        const result = await compactMessages(
          currentMessages,
          compactionSummary,
          summarize
        );
        compactionSummary = result.summary;

        const summaryDisplayText = `The conversation history before this point was compacted into the following summary:\n\n<summary>\n${result.summary}\n</summary>`;
        const summaryMessage: AIUIMessage = {
          id: createId("msg", "ulid"),
          role: "assistant",
          parts: [{ type: "text", text: summaryDisplayText }],
          metadata: {
            createdAt: new Date().toISOString(),
            status: "success",
            summaryText: result.summary,
          },
        };
        await onUpsertMessage(summaryMessage);

        return {
          activeTools: Array.from(activeTools),
          messages: buildCompactedMessages(result.summary, result.keptMessages),
        };
      }

      return { activeTools: Array.from(activeTools) };
    },
  });

  return streamResult.toUIMessageStreamResponse<AIUIMessage>({
    originalMessages: initialMessages,
    generateMessageId: () => createId("msg", "ulid"),
    onFinish: async ({ responseMessage }) => {
      await onUpsertMessage(responseMessage);
    },
    sendReasoning: true,
    sendSources: true,
    onError: (error) => {
      console.error("Agent stream error:", error);
      return formatErrorForUser(error);
    },
    messageMetadata: ({ part }) => {
      if (part.type === "start") {
        return {
          createdAt: new Date(startTime).toISOString(),
          status: "pending",
        };
      }

      if (part.type === "finish") {
        const responseTime = Date.now() - startTime;
        return {
          createdAt: new Date(startTime).toISOString(),
          status: "success",
          usage: part.totalUsage,
          responseTime,
        };
      }
    },
  });
}
