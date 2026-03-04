import type { ChatContext } from "@workspace/types/ai";
import { convertToModelMessages, gateway, stepCountIs, streamText } from "ai";
import { createId } from "@/lib/utils";
import type { AIUIMessage } from "@/types/ai";
import {
  buildInitialActiveTools,
  handleSkillToolResults,
} from "../skills/skill-service";
import { getAiTools } from "../tools/registry";
import { type AgentId, getAgent } from "./registry";

export async function agentRespond({
  messages: initialMessages,
  onUpsertMessage,
  abortSignal,
  userId,
  agentId,
  context,
}: {
  messages: AIUIMessage[];
  onUpsertMessage: (message: AIUIMessage) => Promise<void>;
  abortSignal: AbortSignal;
  userId: string;
  agentId: AgentId;
  context: ChatContext;
}) {
  const startTime = Date.now();

  const agent = getAgent(agentId);

  const systemPrompt = agent.systemPrompt(
    context,
    agent.skills.availableCalled
  );

  const tools = getAiTools(userId);

  let activeTools = buildInitialActiveTools(agent, initialMessages);

  const providerOptions = agent.model.providerOptions;
  const modelId = agent.model.modelId;

  const streamResult = streamText({
    model: gateway(modelId),
    providerOptions,
    system: systemPrompt,
    messages: await convertToModelMessages(initialMessages),
    abortSignal,
    tools,
    stopWhen: stepCountIs(25),
    activeTools: Array.from(activeTools),
    prepareStep: ({ steps }) => {
      const lastStep = steps.at(-1);
      if (lastStep && lastStep.toolResults.length > 0) {
        activeTools = handleSkillToolResults(lastStep.toolResults, activeTools);

        return {
          activeTools: Array.from(activeTools),
        };
      }
      return {};
    },
  });

  return streamResult.toUIMessageStreamResponse<AIUIMessage>({
    originalMessages: initialMessages,
    generateMessageId: () => createId("msg"),
    onFinish: async ({ responseMessage }) => {
      await onUpsertMessage(responseMessage);
    },
    sendReasoning: true,
    sendSources: true,
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
