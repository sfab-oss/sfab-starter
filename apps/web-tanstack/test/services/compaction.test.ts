import type { BaseAIUIMessage } from "@workspace/types/ai";
import type { ModelMessage } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { describe, expect, it } from "vitest";
import {
  buildCompactedMessages,
  buildSummarizationPrompt,
  compactMessages,
  createSummarizer,
  findCompactionCutPoint,
  pruneToolResultsForSummarization,
  resolveCompactionBoundary,
  shouldCompact,
} from "../../src/lib/ai/utils/context/compaction";

// ---------- helpers ----------

function makeStep(inputTokens: number | undefined) {
  return { usage: { inputTokens } } as any;
}

function makeUserMessage(text: string): ModelMessage {
  return {
    role: "user",
    content: [{ type: "text", text }],
  };
}

function makeAssistantMessage(text: string): ModelMessage {
  return {
    role: "assistant",
    content: [{ type: "text", text }],
  };
}

function makeToolMessage(toolName: string, outputValue: string): ModelMessage {
  return {
    role: "tool",
    content: [
      {
        type: "tool-result",
        toolCallId: `call-${toolName}`,
        toolName,
        output: { type: "text", value: outputValue },
      },
    ],
  };
}

function makeUIMessage(
  role: "user" | "assistant",
  text: string,
  metadata?: Record<string, unknown>
): BaseAIUIMessage {
  return {
    id: `msg-${Math.random().toString(36).slice(2, 8)}`,
    role,
    parts: [{ type: "text", text }],
    metadata: {
      createdAt: new Date().toISOString(),
      status: "success" as const,
      ...metadata,
    },
  };
}

function makeSummaryUIMessage(summaryText: string): BaseAIUIMessage {
  return {
    id: `msg-${Math.random().toString(36).slice(2, 8)}`,
    role: "assistant",
    parts: [
      {
        type: "text",
        text: `The conversation history before this point was compacted into the following summary:\n\n<summary>\n${summaryText}\n</summary>`,
      },
    ],
    metadata: {
      createdAt: new Date().toISOString(),
      status: "success" as const,
      summaryText,
    },
  };
}

// ---------- shouldCompact ----------

describe("shouldCompact", () => {
  it("returns false for empty steps", () => {
    expect(shouldCompact([], 1_000_000)).toBe(false);
  });

  it("returns false when well below the limit", () => {
    const steps = [makeStep(100_000)];
    expect(shouldCompact(steps, 1_000_000)).toBe(false);
  });

  it("returns true when within compaction buffer of limit", () => {
    // contextLimit=1_000_000, buffer=20_000, so threshold is 980_000
    const steps = [makeStep(980_001)];
    expect(shouldCompact(steps, 1_000_000)).toBe(true);
  });

  it("returns true when exactly at threshold", () => {
    const steps = [makeStep(980_000)];
    expect(shouldCompact(steps, 1_000_000)).toBe(true);
  });

  it("returns false when one token below threshold", () => {
    const steps = [makeStep(979_999)];
    expect(shouldCompact(steps, 1_000_000)).toBe(false);
  });

  it("checks the last step only, not earlier ones", () => {
    const steps = [makeStep(999_999), makeStep(100)];
    expect(shouldCompact(steps, 1_000_000)).toBe(false);
  });

  it("treats undefined inputTokens as 0", () => {
    const steps = [makeStep(undefined)];
    expect(shouldCompact(steps, 1_000_000)).toBe(false);
  });
});

// ---------- findCompactionCutPoint ----------

describe("findCompactionCutPoint", () => {
  it("returns 0 for a single message (keeps at least the last)", () => {
    const messages = [makeUserMessage("hello")];
    expect(findCompactionCutPoint(messages)).toBe(0);
  });

  it("with two short messages, summarizes the first and keeps the second", () => {
    const messages = [makeUserMessage("hello"), makeAssistantMessage("hi")];
    // Both well under 80,000 chars, so loop never breaks -> cutIndex = messages.length
    // Guard sets it to messages.length - 1 = 1
    expect(findCompactionCutPoint(messages)).toBe(1);
  });

  it("keeps recent messages within KEEP_RECENT_CHARS and summarizes the rest", () => {
    // Build messages where total >> 80,000 chars
    const messages: ModelMessage[] = [];
    for (let i = 0; i < 30; i++) {
      messages.push(makeUserMessage(`msg ${i}: ${"x".repeat(4000)}`));
    }
    // Each message JSON is ~4050 chars. 30 messages = ~121,500 chars.
    // Walking backwards, ~20 messages = ~81,000 chars which exceeds 80,000.
    // So cutIndex should be around message index 10-11 (keeping ~20 recent)

    const cutIndex = findCompactionCutPoint(messages);

    // cutIndex should be > 0 (some old messages to summarize)
    expect(cutIndex).toBeGreaterThan(0);
    // cutIndex should be < messages.length (some kept)
    expect(cutIndex).toBeLessThan(messages.length);

    // Kept messages should be the tail of the array
    const kept = messages.slice(cutIndex);
    const lastKept = kept.at(-1);
    expect(lastKept).toBe(messages.at(-1));

    // First kept message should come after summarized messages
    const firstKept = kept[0];
    expect(messages.indexOf(firstKept)).toBe(cutIndex);
  });

  it("never returns a cut point beyond the array (always keeps at least the last message)", () => {
    const messages = [
      makeUserMessage("a"),
      makeUserMessage("b"),
      makeUserMessage("c"),
    ];
    const cutIndex = findCompactionCutPoint(messages);
    expect(cutIndex).toBeLessThan(messages.length);
    expect(messages.slice(cutIndex).length).toBeGreaterThanOrEqual(1);
  });

  it("handles empty messages array", () => {
    const cutIndex = findCompactionCutPoint([]);
    // Max(0, 0 - 1) = 0
    expect(cutIndex).toBe(0);
  });

  it("summarizes all old messages and keeps only those fitting in recent window", () => {
    // Create 5 large messages + 1 small recent one
    const messages: ModelMessage[] = [];
    for (let i = 0; i < 5; i++) {
      messages.push(makeUserMessage(`old ${i}: ${"a".repeat(20_000)}`));
    }
    messages.push(makeUserMessage("recent question"));

    // 5 * ~20050 chars = ~100,250 chars total for old messages
    // Walking backwards: "recent question" is tiny, then each old message adds ~20,050
    // After 4 old messages from the back: ~80,200 chars >= 80,000 -> break
    // cutIndex should be at index 1 or 2 (keeping the recent + 3-4 old)

    const cutIndex = findCompactionCutPoint(messages);
    const kept = messages.slice(cutIndex);

    // The most recent message should definitely be kept
    expect(kept.at(-1)).toBe(messages.at(-1));

    // Some old messages should be in the summarize portion
    expect(cutIndex).toBeGreaterThan(0);
  });
});

// ---------- pruneToolResultsForSummarization ----------

describe("pruneToolResultsForSummarization", () => {
  it("leaves non-tool messages unchanged", () => {
    const messages: ModelMessage[] = [
      makeUserMessage("hello"),
      makeAssistantMessage("hi there"),
    ];
    const result = pruneToolResultsForSummarization(messages);
    expect(result).toEqual(messages);
  });

  it("leaves short tool outputs unchanged", () => {
    const messages: ModelMessage[] = [makeToolMessage("test", "short output")];
    const result = pruneToolResultsForSummarization(messages);
    expect(result).toEqual(messages);
  });

  it("truncates tool outputs exceeding 500 chars", () => {
    const longOutput = "x".repeat(1000);
    const messages: ModelMessage[] = [makeToolMessage("test", longOutput)];
    const result = pruneToolResultsForSummarization(messages);

    const toolContent = result[0] as any;
    const output = toolContent.content[0].output;
    expect(output.type).toBe("text");
    expect(output.value).toContain("... [truncated]");
    expect(output.value.length).toBeLessThan(longOutput.length);
    // Should be 500 chars + "... [truncated]"
    expect(output.value).toHaveLength(500 + "... [truncated]".length);
  });

  it("does not mutate the original messages", () => {
    const longOutput = "x".repeat(1000);
    const messages: ModelMessage[] = [makeToolMessage("test", longOutput)];
    pruneToolResultsForSummarization(messages);

    const originalOutput = (messages[0] as any).content[0].output;
    expect(originalOutput.value).toBe(longOutput);
  });

  it("handles mixed messages with some tool results needing truncation", () => {
    const messages: ModelMessage[] = [
      makeUserMessage("do something"),
      makeToolMessage("short-tool", "ok"),
      makeToolMessage("long-tool", "y".repeat(800)),
      makeAssistantMessage("done"),
    ];
    const result = pruneToolResultsForSummarization(messages);

    // User and assistant unchanged
    expect(result[0]).toEqual(messages[0]);
    expect(result[3]).toEqual(messages[3]);

    // Short tool output unchanged
    const shortTool = result[1] as any;
    expect(shortTool.content[0].output.value).toBe("ok");

    // Long tool output truncated
    const longTool = result[2] as any;
    expect(longTool.content[0].output.value).toContain("... [truncated]");
  });

  it("leaves tool output at exactly 500 chars unchanged", () => {
    const exactOutput = "z".repeat(500);
    const messages: ModelMessage[] = [makeToolMessage("test", exactOutput)];
    const result = pruneToolResultsForSummarization(messages);
    const output = (result[0] as any).content[0].output;
    expect(output.value).toBe(exactOutput);
  });
});

// ---------- buildCompactedMessages ----------

describe("buildCompactedMessages", () => {
  it("places summary message first, then kept messages in order", () => {
    const kept: ModelMessage[] = [
      makeUserMessage("recent question"),
      makeAssistantMessage("recent answer"),
    ];
    const result = buildCompactedMessages("the summary", kept);

    expect(result).toHaveLength(3);

    // First message is the summary
    expect(result[0].role).toBe("user");
    const summaryText = (result[0] as any).content[0].text;
    expect(summaryText).toContain("<summary>");
    expect(summaryText).toContain("the summary");
    expect(summaryText).toContain("</summary>");

    // Kept messages follow in original order
    expect(result[1]).toBe(kept[0]);
    expect(result[2]).toBe(kept[1]);
  });

  it("works with empty kept messages", () => {
    const result = buildCompactedMessages("summary", []);
    expect(result).toHaveLength(1);
    expect(result[0].role).toBe("user");
  });

  it("preserves kept message references (no deep clone)", () => {
    const msg = makeUserMessage("test");
    const result = buildCompactedMessages("summary", [msg]);
    expect(result[1]).toBe(msg);
  });
});

// ---------- buildSummarizationPrompt ----------

describe("buildSummarizationPrompt", () => {
  it("includes conversation text from messages", () => {
    const messages: ModelMessage[] = [
      makeUserMessage("create a product"),
      makeAssistantMessage("done, product created"),
    ];
    const prompt = buildSummarizationPrompt(messages, null);
    expect(prompt).toContain("[user]:");
    expect(prompt).toContain("create a product");
    expect(prompt).toContain("[assistant]:");
    expect(prompt).toContain("done, product created");
  });

  it("includes previous summary when provided", () => {
    const messages: ModelMessage[] = [makeUserMessage("hello")];
    const prompt = buildSummarizationPrompt(
      messages,
      "Earlier: user set up inventory"
    );
    expect(prompt).toContain("Previous summary of earlier conversation");
    expect(prompt).toContain("Earlier: user set up inventory");
  });

  it("does not include previous summary section when null", () => {
    const messages: ModelMessage[] = [makeUserMessage("hello")];
    const prompt = buildSummarizationPrompt(messages, null);
    expect(prompt).not.toContain("Previous summary");
  });

  it("prunes long tool results in the summarization input", () => {
    const messages: ModelMessage[] = [
      makeToolMessage("search", "x".repeat(1000)),
    ];
    const prompt = buildSummarizationPrompt(messages, null);
    // The tool output in the prompt should be truncated, not the full 1000 chars
    expect(prompt).toContain("... [truncated]");
    expect(prompt).not.toContain("x".repeat(1000));
  });
});

// ---------- compactMessages ----------

describe("compactMessages", () => {
  const fakeSummarize = (prompt: string) =>
    Promise.resolve(`Summary of: ${prompt.slice(0, 50)}`);

  it("returns the summarizer output as the summary", async () => {
    const messages: ModelMessage[] = [
      makeUserMessage("old message"),
      makeAssistantMessage("recent"),
    ];
    const result = await compactMessages(messages, null, fakeSummarize);
    expect(result.summary).toContain("Summary of:");
  });

  it("kept messages are the recent portion of the array", async () => {
    const messages: ModelMessage[] = [];
    for (let i = 0; i < 30; i++) {
      messages.push(makeUserMessage(`msg ${i}: ${"x".repeat(4000)}`));
    }

    const result = await compactMessages(messages, null, fakeSummarize);

    // keptMessages should be the tail
    const lastKept = result.keptMessages.at(-1);
    expect(lastKept).toBe(messages.at(-1));

    // keptMessages should be a subset
    expect(result.keptMessages.length).toBeGreaterThan(0);
    expect(result.keptMessages.length).toBeLessThan(messages.length);
  });

  it("passes the right messages to the summarizer (old ones, not kept)", async () => {
    let receivedPrompt = "";
    const capturingSummarize = (prompt: string) => {
      receivedPrompt = prompt;
      return Promise.resolve("summary");
    };

    const messages: ModelMessage[] = [];
    for (let i = 0; i < 30; i++) {
      messages.push(makeUserMessage(`msg-${i}: ${"x".repeat(4000)}`));
    }

    const result = await compactMessages(messages, null, capturingSummarize);

    // The prompt should contain early messages that were summarized
    expect(receivedPrompt).toContain("msg-0:");

    // Find the cut point to know what's kept vs summarized
    const firstKeptIndex = messages.indexOf(result.keptMessages[0]);
    // Messages before firstKeptIndex should be in the prompt
    expect(receivedPrompt).toContain("msg-0:");
    // Messages at or after firstKeptIndex should NOT be in the prompt
    expect(receivedPrompt).not.toContain(`msg-${firstKeptIndex}:`);
  });

  it("chains existing summary into the prompt", async () => {
    let receivedPrompt = "";
    const capturingSummarize = (prompt: string) => {
      receivedPrompt = prompt;
      return Promise.resolve("new summary");
    };

    const messages: ModelMessage[] = [
      makeUserMessage("hello"),
      makeAssistantMessage("hi"),
    ];

    await compactMessages(
      messages,
      "previous context about products",
      capturingSummarize
    );

    expect(receivedPrompt).toContain(
      "Previous summary of earlier conversation"
    );
    expect(receivedPrompt).toContain("previous context about products");
  });
});

// ---------- createSummarizer with MockLanguageModelV3 ----------

describe("createSummarizer", () => {
  it("calls generateText with the mock model and returns the text", async () => {
    const mockModel = new MockLanguageModelV3({
      doGenerate: async () => ({
        content: [{ type: "text", text: "Mock summary from model" }],
        finishReason: { unified: "stop", raw: undefined },
        usage: {
          inputTokens: { total: 10, noCache: 10 },
          outputTokens: { total: 20, text: 20 },
        },
        warnings: [],
      }),
    });

    const summarize = createSummarizer(mockModel);
    const result = await summarize("Summarize this conversation");
    expect(result).toBe("Mock summary from model");
  });

  it("works end-to-end with compactMessages", async () => {
    let capturedPrompt = "";
    const mockModel = new MockLanguageModelV3({
      doGenerate: (args) => {
        capturedPrompt = JSON.stringify(args.prompt);
        return Promise.resolve({
          content: [{ type: "text", text: "User wanted to manage inventory." }],
          finishReason: { unified: "stop", raw: undefined },
          usage: {
            inputTokens: { total: 50, noCache: 50 },
            outputTokens: { total: 30, text: 30 },
          },
          warnings: [],
        });
      },
    });

    const messages: ModelMessage[] = [
      makeUserMessage("I want to add a product"),
      makeAssistantMessage("Sure, what product?"),
    ];

    const summarize = createSummarizer(mockModel);
    const result = await compactMessages(messages, null, summarize);

    expect(result.summary).toBe("User wanted to manage inventory.");
    expect(capturedPrompt).toContain("add a product");
  });
});

// ---------- resolveCompactionBoundary ----------

describe("resolveCompactionBoundary", () => {
  it("returns all messages and null summary when no summary exists", () => {
    const messages: BaseAIUIMessage[] = [
      makeUIMessage("user", "hello"),
      makeUIMessage("assistant", "hi there"),
    ];
    const result = resolveCompactionBoundary(messages);
    expect(result.messages).toBe(messages);
    expect(result.summaryText).toBeNull();
  });

  it("returns empty array and null summary for empty input", () => {
    const result = resolveCompactionBoundary([]);
    expect(result.messages).toEqual([]);
    expect(result.summaryText).toBeNull();
  });

  it("returns from summary onward with summaryText when one summary exists", () => {
    const messages: BaseAIUIMessage[] = [
      makeUIMessage("user", "old message 1"),
      makeUIMessage("assistant", "old reply"),
      makeSummaryUIMessage("User discussed products"),
      makeUIMessage("user", "new question"),
      makeUIMessage("assistant", "new answer"),
    ];
    const result = resolveCompactionBoundary(messages);
    expect(result.messages).toHaveLength(3);
    expect(result.messages[0]).toBe(messages[2]); // summary
    expect(result.messages[1]).toBe(messages[3]); // new question
    expect(result.messages[2]).toBe(messages[4]); // new answer
    expect(result.summaryText).toBe("User discussed products");
  });

  it("returns from the last summary onward when multiple summaries exist", () => {
    const messages: BaseAIUIMessage[] = [
      makeUIMessage("user", "very old message"),
      makeSummaryUIMessage("First summary"),
      makeUIMessage("user", "middle message"),
      makeSummaryUIMessage("Second summary"),
      makeUIMessage("user", "recent message"),
    ];
    const result = resolveCompactionBoundary(messages);
    expect(result.messages).toHaveLength(2);
    expect(result.messages[0]).toBe(messages[3]); // second summary
    expect(result.messages[1]).toBe(messages[4]); // recent message
    expect(result.summaryText).toBe("Second summary");
  });

  it("returns just the summary when it is the last message", () => {
    const messages: BaseAIUIMessage[] = [
      makeUIMessage("user", "old message"),
      makeSummaryUIMessage("Summary at the end"),
    ];
    const result = resolveCompactionBoundary(messages);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toBe(messages[1]);
    expect(result.summaryText).toBe("Summary at the end");
  });

  it("ignores messages without summaryText in metadata", () => {
    const messages: BaseAIUIMessage[] = [
      makeUIMessage("user", "hello"),
      makeUIMessage("assistant", "hi"),
      makeUIMessage("user", "how are you"),
    ];
    const result = resolveCompactionBoundary(messages);
    expect(result.messages).toBe(messages);
    expect(result.summaryText).toBeNull();
  });
});
