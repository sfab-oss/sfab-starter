import type { ChatContext } from "@workspace/types/ai";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  gateway,
  stepCountIs,
  streamText,
} from "ai";
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
import {
  buildInitialActiveTools,
  handleSkillToolResults,
} from "./utils/skill-service";
import { createThrottledCancelCheck } from "./utils/stream/cancel-check";
import { createCompletionCallbacks } from "./utils/stream/completion-callbacks";
import { patchTruncatedTextParts } from "./utils/stream/patch-truncated-text";

const AGENT_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export async function agentRespond({
  messages: allMessages,
  onUpsertMessage,
  orgId,
  chatId,
  userId,
  agentId,
  context,
  onComplete,
  onError,
  checkCanceled,
}: {
  messages: AIUIMessage[];
  onUpsertMessage: (message: AIUIMessage) => Promise<void>;
  orgId: string;
  chatId: string;
  userId: string;
  agentId: AgentId;
  context: ChatContext;
  onComplete?: () => Promise<void>;
  onError?: (error: unknown) => Promise<void>;
  checkCanceled?: () => Promise<boolean>;
}) {
  const startTime = Date.now();
  const abortController = new AbortController();
  const timeout = setTimeout(
    () =>
      abortController.abort(new Error("Agent timeout: exceeded 10 minutes")),
    AGENT_TIMEOUT_MS
  );

  const completionCallbacks = createCompletionCallbacks({
    onUpsertMessage,
    onComplete,
    onError,
    cleanupTimeout: () => clearTimeout(timeout),
  });

  const { messages: initialMessages, summaryText } =
    resolveCompactionBoundary(allMessages);

  const agent = getAgent(agentId);

  const systemPrompt = agent.systemPrompt(
    context,
    agent.skills.availableCalled
  );

  const tools = getAiTools({ orgId, chatId, userId });

  let activeTools = buildInitialActiveTools(agent, initialMessages);

  const providerOptions = agent.model.providerOptions;
  const modelId = agent.model.modelId;
  const contextLimit = 1_000_000;
  const summarize = createSummarizer(gateway(modelId));
  let compactionSummary: string | null = summaryText;

  const throttledCancelCheck = checkCanceled
    ? createThrottledCancelCheck(checkCanceled, abortController)
    : undefined;

  const streamResult = streamText({
    model: gateway(modelId),
    providerOptions,
    system: systemPrompt,
    messages: await convertToModelMessages(initialMessages),
    abortSignal: abortController.signal,
    tools,
    stopWhen: stepCountIs(25),
    activeTools: Array.from(activeTools),
    onChunk: throttledCancelCheck,
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

  // Deferred promise that resolves when all work (stream + onFinish) completes.
  // Pass this to waitUntil() to keep the Worker alive after client disconnect.
  let resolveCompletion!: () => void;
  let rejectCompletion!: (error: unknown) => void;
  const completionPromise = new Promise<void>((resolve, reject) => {
    resolveCompletion = resolve;
    rejectCompletion = reject;
  });

  // Client disconnect resilience — sequence of events:
  //
  // onFinish fires when the *client-facing* stream closes, NOT when the
  // underlying LLM stream completes. This distinction matters because the
  // client can disconnect (or be aborted) before the LLM finishes generating.
  //
  // Normal (client stays connected):
  //   execute starts → consumeStream() runs → execute returns →
  //   onFinish fires with complete responseMessage → save → done
  //
  // Client disconnects mid-stream:
  //   execute starts → consumeStream() running → CLIENT DISCONNECTS →
  //   onFinish fires EARLY with truncated responseMessage →
  //   onFinish blocks on stepTextsReady → consumeStream() completes →
  //   step texts captured → resolveStepTextsReady() →
  //   onFinish resumes → patches truncated text → save → done
  //
  // Abort (stop button):
  //   execute starts → consumeStream() running → ABORT →
  //   onFinish fires with partial responseMessage (text up to abort) →
  //   stepTextsReady resolves (via finally) → patching is a no-op
  //   (step text ≤ part text) → save partial → done
  const completeStepTexts: string[] = [];
  let resolveStepTextsReady!: () => void;
  const stepTextsReady = new Promise<void>((resolve) => {
    resolveStepTextsReady = resolve;
  });

  const stream = createUIMessageStream<AIUIMessage>({
    execute: async ({ writer }) => {
      writer.merge(
        streamResult.toUIMessageStream({
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
        })
      );

      // Consume stream to completion even if client disconnects
      try {
        await streamResult.consumeStream();

        const steps = await streamResult.steps;
        for (const step of steps) {
          completeStepTexts.push(step.text);
        }
      } finally {
        // Always signal so onFinish doesn't hang forever
        resolveStepTextsReady();
      }
    },
    originalMessages: initialMessages,
    generateId: () => createId("msg", "ulid"),
    onFinish: async ({ responseMessage }) => {
      try {
        // Wait for consumeStream() to finish and capture complete text.
        // On client disconnect, onFinish fires early with truncated text.
        // On abort (stop button), onFinish fires with partial text which
        // is already the correct amount — patching is a no-op.
        await stepTextsReady;

        const patchedMessage = {
          ...responseMessage,
          parts: patchTruncatedTextParts(
            responseMessage.parts,
            completeStepTexts
          ),
        };

        await completionCallbacks.onFinish({ responseMessage: patchedMessage });
        resolveCompletion();
      } catch (error) {
        rejectCompletion(error);
      }
    },
    onError: completionCallbacks.onError,
  });

  const response = createUIMessageStreamResponse({ stream });

  return { response, completionPromise };
}
