import type { BaseAIUIMessage } from "@workspace/types/ai";
import type { LanguageModel, ModelMessage, StepResult } from "ai";
import { generateText } from "ai";

const COMPACTION_BUFFER = 20_000;
const KEEP_RECENT_CHARS = 80_000; // ~20k tokens at 4 chars/token
const TOOL_RESULT_TRUNCATE_CHARS = 500;

const SUMMARIZATION_PROMPT = `You are a context summarization assistant. Summarize the conversation so it can continue seamlessly.

Structure your summary as:

## Goal
[What the user is trying to accomplish]

## Key Instructions
[Important instructions or constraints the user specified]

## Progress
- Completed: [what has been done]
- In Progress: [what was being worked on]
- Remaining: [what still needs to be done]

## Key Discoveries
[Important information learned during the conversation]

## Active Context
[Any IDs, names, or references needed for the next steps]`;

/**
 * Check if compaction is needed based on cumulative input token usage.
 */
export function shouldCompact(
  // biome-ignore lint/suspicious/noExplicitAny: StepResult generic must be wide to accept any tool configuration
  steps: StepResult<any>[],
  contextLimit: number
): boolean {
  const lastStep = steps.at(-1);
  if (!lastStep) {
    return false;
  }
  return (lastStep.usage.inputTokens ?? 0) >= contextLimit - COMPACTION_BUFFER;
}

/**
 * Estimate character length of a model message for finding the cut point.
 */
function estimateMessageChars(message: ModelMessage): number {
  return JSON.stringify(message).length;
}

/**
 * Truncate tool result content in messages to reduce summarization input size.
 */
export function pruneToolResultsForSummarization(
  messages: ModelMessage[]
): ModelMessage[] {
  return messages.map((msg) => {
    if (msg.role !== "tool") {
      return msg;
    }
    return {
      ...msg,
      content: msg.content.map((part) => {
        if (part.type !== "tool-result") {
          return part;
        }
        const output = part.output;
        let serialized: string;
        if ("value" in output) {
          serialized =
            typeof output.value === "string"
              ? output.value
              : JSON.stringify(output.value);
        } else {
          serialized = JSON.stringify(output);
        }
        if (serialized.length <= TOOL_RESULT_TRUNCATE_CHARS) {
          return part;
        }
        return {
          ...part,
          output: {
            type: "text" as const,
            value: `${serialized.slice(0, TOOL_RESULT_TRUNCATE_CHARS)}... [truncated]`,
          },
        };
      }),
    };
  });
}

/**
 * Find the index where messages should be split: messages before this index
 * get summarized, messages from this index onward are kept verbatim.
 * Walks backwards keeping ~KEEP_RECENT_CHARS worth of recent messages.
 */
export function findCompactionCutPoint(messages: ModelMessage[]): number {
  let charCount = 0;
  let cutIndex = messages.length;
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (!msg) {
      continue;
    }
    charCount += estimateMessageChars(msg);
    if (charCount >= KEEP_RECENT_CHARS) {
      cutIndex = i + 1;
      break;
    }
  }

  // Keep at least the last message
  if (cutIndex >= messages.length) {
    cutIndex = Math.max(0, messages.length - 1);
  }

  return cutIndex;
}

export type SummarizeFn = (prompt: string) => Promise<string>;

/**
 * Default summarizer — calls generateText with the given model.
 */
export function createSummarizer(model: LanguageModel): SummarizeFn {
  return async (prompt: string) => {
    const result = await generateText({
      model,
      system: SUMMARIZATION_PROMPT,
      prompt,
    });
    return result.text;
  };
}

/**
 * Build the prompt text that gets sent to the summarizer.
 */
export function buildSummarizationPrompt(
  messagesToSummarize: ModelMessage[],
  existingSummary: string | null
): string {
  const prunedMessages = pruneToolResultsForSummarization(messagesToSummarize);
  const conversationText = prunedMessages
    .map((msg) => {
      const content =
        typeof msg.content === "string"
          ? msg.content
          : JSON.stringify(msg.content);
      return `[${msg.role}]: ${content}`;
    })
    .join("\n\n");

  const previousSummarySection = existingSummary
    ? `\n\nPrevious summary of earlier conversation:\n${existingSummary}\n\n`
    : "";

  return `${previousSummarySection}Summarize the following conversation:\n\n${conversationText}`;
}

/**
 * Compact messages by summarizing old messages and keeping recent ones.
 */
export async function compactMessages(
  messages: ModelMessage[],
  existingSummary: string | null,
  summarize: SummarizeFn
): Promise<{ summary: string; keptMessages: ModelMessage[] }> {
  const cutIndex = findCompactionCutPoint(messages);
  const messagesToSummarize = messages.slice(0, cutIndex);
  const keptMessages = messages.slice(cutIndex);

  const prompt = buildSummarizationPrompt(messagesToSummarize, existingSummary);
  const summary = await summarize(prompt);

  return { summary, keptMessages };
}

/**
 * Build the compacted message array with summary injected as a user message.
 */
export function buildCompactedMessages(
  summary: string,
  keptMessages: ModelMessage[]
): ModelMessage[] {
  const summaryMessage: ModelMessage = {
    role: "user",
    content: [
      {
        type: "text",
        text: `The conversation history before this point was compacted into the following summary:\n\n<summary>\n${summary}\n</summary>`,
      },
    ],
  };
  return [summaryMessage, ...keptMessages];
}

export interface CompactionBoundary<
  T extends BaseAIUIMessage = BaseAIUIMessage,
> {
  messages: T[];
  summaryText: string | null;
}

/**
 * Find the last message with a `metadata.summaryText` value, return messages
 * from that point onward and the raw summary text for chaining.
 * If no summary exists, returns all messages and null summary.
 */
export function resolveCompactionBoundary<T extends BaseAIUIMessage>(
  messages: T[]
): CompactionBoundary<T> {
  if (messages.length === 0) {
    return { messages, summaryText: null };
  }

  for (let i = messages.length - 1; i >= 0; i--) {
    const meta = messages[i]?.metadata;
    if (meta && "summaryText" in meta && typeof meta.summaryText === "string") {
      return {
        messages: messages.slice(i),
        summaryText: meta.summaryText,
      };
    }
  }

  return { messages, summaryText: null };
}
