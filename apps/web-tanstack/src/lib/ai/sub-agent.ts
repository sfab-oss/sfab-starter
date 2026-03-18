import {
  createChat,
  getChatStatus,
  updateChatStatus,
  upsertMessageToChat,
} from "@workspace/core/chat";
import { convertToModelMessages, gateway, stepCountIs, streamText } from "ai";
import { safeWaitUntil } from "@/hono/utils/wait-until";
import { createId } from "@/lib/utils";
import type { AIUIMessage } from "@/types/ai";
import { getAgent } from "./agents";
import { getBaseAiTools } from "./tools";

const SUB_AGENT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

interface RunSubAgentParams {
  prompt: string;
  orgId: string;
  userId: string;
  parentChatId: string;
  mode: "foreground" | "background";
}

interface SubAgentResult {
  childChatId: string;
  output: string;
}

function buildSubAgentSystemPrompt(): string {
  return `You are a focused sub-agent executing a specific task.

- Execute the task described in the user message precisely and efficiently.
- You have access to tools and should use them as needed.
- Do NOT ask clarifying questions — work with what you have.
- When done, provide a clear, concise summary of what you accomplished and the results.
- If you encounter errors, describe what went wrong and what you tried.`;
}

/** Strip needsApproval from tools so sub-agents auto-execute everything. */
function getSubAgentTools(orgId: string) {
  const tools = getBaseAiTools(orgId);
  for (const t of Object.values(tools)) {
    // biome-ignore lint/performance/noDelete: need to remove property from tool descriptor
    delete (t as Record<string, unknown>).needsApproval;
  }
  return tools;
}

type BaseToolId = keyof ReturnType<typeof getBaseAiTools>;

async function executeSubAgent({
  childChatId,
  prompt,
  orgId,
  userId,
}: {
  childChatId: string;
  prompt: string;
  orgId: string;
  userId: string;
}): Promise<string> {
  const abortController = new AbortController();
  const timeout = setTimeout(
    () =>
      abortController.abort(new Error("Sub-agent timeout: exceeded 5 minutes")),
    SUB_AGENT_TIMEOUT_MS
  );

  const checkCanceled = async () => {
    const current = await getChatStatus(childChatId);
    return current?.status !== "processing";
  };

  await updateChatStatus(childChatId, "processing");

  try {
    const agent = getAgent("general-agent");
    const tools = getSubAgentTools(orgId);
    const toolKeys = Object.keys(tools) as BaseToolId[];
    const activeToolsList = [...toolKeys];

    const userMessage: AIUIMessage = {
      id: createId("msg", "ulid"),
      role: "user",
      parts: [{ type: "text", text: prompt }],
      metadata: {
        createdAt: new Date().toISOString(),
        status: "success",
      },
    };

    const streamResult = streamText({
      model: gateway(agent.model.modelId),
      providerOptions: agent.model.providerOptions,
      system: buildSubAgentSystemPrompt(),
      messages: await convertToModelMessages([userMessage]),
      abortSignal: abortController.signal,
      tools,
      stopWhen: stepCountIs(15),
      activeTools: activeToolsList,
      prepareStep: async () => {
        // Check cancellation
        if (await checkCanceled()) {
          abortController.abort(new Error("Sub-agent canceled"));
        }

        return { activeTools: activeToolsList };
      },
    });

    await streamResult.consumeStream();

    const steps = await streamResult.steps;
    const fullText = steps
      .map((s) => s.text)
      .filter(Boolean)
      .join("\n\n");

    // Save the assistant response message
    const responseMessage: AIUIMessage = {
      id: createId("msg", "ulid"),
      role: "assistant",
      parts: [{ type: "text", text: fullText || "Task completed." }],
      metadata: {
        createdAt: new Date().toISOString(),
        status: "success",
      },
    };
    await upsertMessageToChat({
      chatId: childChatId,
      userId,
      message: responseMessage,
    });

    await updateChatStatus(childChatId, "idle");
    return fullText || "Task completed (no text output).";
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown sub-agent error";
    await updateChatStatus(childChatId, "failed", errorMessage);
    return `Sub-agent failed: ${errorMessage}`;
  } finally {
    clearTimeout(timeout);
  }
}

export async function runSubAgent({
  prompt,
  orgId,
  userId,
  parentChatId,
  mode,
}: RunSubAgentParams): Promise<SubAgentResult> {
  const childChatId = createId("chat");
  const title = prompt.length > 60 ? `${prompt.slice(0, 57)}...` : prompt;

  // Create the child chat record
  const userMessage: AIUIMessage = {
    id: createId("msg", "ulid"),
    role: "user",
    parts: [{ type: "text", text: prompt }],
    metadata: {
      createdAt: new Date().toISOString(),
      status: "success",
    },
  };

  await createChat({
    id: childChatId,
    userId,
    organizationId: orgId,
    title,
    message: userMessage,
    parentChatId,
  });

  if (mode === "foreground") {
    const output = await executeSubAgent({
      childChatId,
      prompt,
      orgId,
      userId,
    });
    return { childChatId, output };
  }

  // Background mode: fire-and-forget
  const backgroundPromise = executeSubAgent({
    childChatId,
    prompt,
    orgId,
    userId,
  });
  safeWaitUntil(backgroundPromise);

  return {
    childChatId,
    output: "Background sub-agent started.",
  };
}
