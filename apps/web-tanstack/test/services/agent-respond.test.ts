import {
  convertToModelMessages,
  simulateReadableStream,
  stepCountIs,
  streamText,
} from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { describe, expect, it, vi } from "vitest";
import { getAgent } from "../../src/lib/ai/agents";
import { generalAgent } from "../../src/lib/ai/agents/general-agent";
import { getAiTools } from "../../src/lib/ai/tools";
import {
  buildInitialActiveTools,
  getSkillDefinition,
  handleSkillToolResults,
} from "../../src/lib/ai/utils/skill-service";
import type { AIUIMessage } from "../../src/types/ai";

// ---------- helpers ----------

function makeUserMessage(text: string): AIUIMessage {
  return {
    id: crypto.randomUUID(),
    role: "user",
    parts: [{ type: "text", text }],
    metadata: {
      createdAt: new Date().toISOString(),
      status: "success",
    },
  } as AIUIMessage;
}

function makeTextStreamChunks(text: string) {
  return [
    { type: "text-start" as const, id: "text-1" },
    { type: "text-delta" as const, id: "text-1", delta: text },
    { type: "text-end" as const, id: "text-1" },
    {
      type: "finish" as const,
      finishReason: { unified: "stop" as const, raw: undefined },
      usage: {
        inputTokens: { total: 10, noCache: 10 },
        outputTokens: { total: 20, text: 20 },
      },
    },
  ];
}

/**
 * In AI SDK V3, `streamText` converts the `system` string and `messages` into
 * a single `prompt` array before passing to the model. The `activeTools` option
 * filters the `tools` object, so the model only sees the allowed subset.
 * We capture args directly in the mock's doStream to inspect what the model receives.
 */
interface CapturedCall {
  prompt: Array<{ role: string; content: unknown }>;
  tools?: Record<string, unknown>;
}

// ---------- registry tests ----------

describe("getAgent", () => {
  it("resolves the general-agent", () => {
    const agent = getAgent("general-agent");
    expect(agent).toBe(generalAgent);
    expect(agent.id).toBe("general-agent");
  });
});

// ---------- streamText with mock model ----------

describe("streamText orchestration with mock model", () => {
  it("passes system prompt and filtered tools to the model", async () => {
    let captured: CapturedCall | null = null;
    const model = new MockLanguageModelV3({
      doStream: (args) => {
        captured = args as unknown as CapturedCall;
        return {
          stream: simulateReadableStream({
            initialDelayInMs: null,
            chunkDelayInMs: null,
            chunks: makeTextStreamChunks("Hello!"),
          }),
        };
      },
    });

    const messages = [makeUserMessage("Hi")];
    const agent = getAgent("general-agent");
    const activeTools = buildInitialActiveTools(agent, messages);

    const result = streamText({
      model,
      system: agent.systemPrompt(
        { route: { pathname: "/test" } },
        agent.skills.availableCalled
      ),
      messages: await convertToModelMessages(messages),
      tools: getAiTools("test-org"),
      activeTools: Array.from(activeTools),
      stopWhen: stepCountIs(25),
    });

    const response = result.toUIMessageStreamResponse();
    expect(response).toBeInstanceOf(Response);
    expect(response.body).not.toBeNull();

    await result.text;
    expect(captured).not.toBeNull();
    const call = captured as CapturedCall;

    // System prompt is embedded in prompt array as a system message
    const systemText = JSON.stringify(call.prompt);
    expect(systemText).toContain("Clippy");
    expect(systemText).toContain("product-manager");

    // activeTools filters what the model sees — only active tools
    if (call.tools) {
      const toolNames = Object.keys(call.tools);
      // Should have exactly the active tools (load-skill + show-message + sub-agent tools = 5)
      expect(toolNames.length).toBe(5);
    }
  });

  it("only active tools are visible to the model", async () => {
    let captured: CapturedCall | null = null;
    const model = new MockLanguageModelV3({
      doStream: (args) => {
        captured = args as unknown as CapturedCall;
        return {
          stream: simulateReadableStream({
            initialDelayInMs: null,
            chunkDelayInMs: null,
            chunks: makeTextStreamChunks("Done"),
          }),
        };
      },
    });

    const messages = [makeUserMessage("Hello")];
    const agent = getAgent("general-agent");
    const activeTools = buildInitialActiveTools(agent, messages);

    // general-agent has no defaultLoaded skills, so only system tools are active
    expect(activeTools.has("load-skill")).toBe(true);
    expect(activeTools.has("show-message")).toBe(true);
    expect(activeTools.has("list-products" as never)).toBe(false);

    const result = streamText({
      model,
      system: "test",
      messages: await convertToModelMessages(messages),
      tools: getAiTools("test-org"),
      activeTools: Array.from(activeTools),
    });

    await result.text;

    // Model should only see the active tools (system tools + sub-agent tools)
    if (captured?.tools) {
      const toolNames = Object.keys(captured.tools);
      expect(toolNames.length).toBe(5);
    }
  });

  it("prepareStep callback correctly expands activeTools after skill load", () => {
    // Tests the exact prepareStep logic used in agentRespond
    // without requiring multi-step streaming (which hangs in the Workers runtime)
    const agent = getAgent("general-agent");
    let activeTools = buildInitialActiveTools(agent, []);

    // Initially only system tools
    expect(activeTools.has("load-skill")).toBe(true);
    expect(activeTools.has("show-message")).toBe(true);
    expect(activeTools.has("list-products" as never)).toBe(false);

    // Simulate what prepareStep does: after a load-skill tool result
    const productSkill = getSkillDefinition("product-manager");
    expect(productSkill).not.toBeNull();

    const mockToolResults = [
      {
        toolName: "load-skill" as const,
        toolCallId: "call-1",
        args: { name: "product-manager" },
        output: {
          success: true as const,
          definition: productSkill as NonNullable<typeof productSkill>,
        },
      },
    ];

    activeTools = handleSkillToolResults(mockToolResults, activeTools);

    // Now product tools should be active
    expect(activeTools.has("list-products" as never)).toBe(true);
    expect(activeTools.has("create-product" as never)).toBe(true);
    expect(activeTools.has("update-product" as never)).toBe(true);
    expect(activeTools.has("delete-product" as never)).toBe(true);
    expect(activeTools.has("get-product" as never)).toBe(true);

    // System tools still present
    expect(activeTools.has("load-skill")).toBe(true);
    expect(activeTools.has("show-message")).toBe(true);
  });

  it("onFinish is called with response message", async () => {
    const model = new MockLanguageModelV3({
      doStream: () => ({
        stream: simulateReadableStream({
          initialDelayInMs: null,
          chunkDelayInMs: null,
          chunks: makeTextStreamChunks("Here is your answer"),
        }),
      }),
    });

    const messages = [makeUserMessage("Question")];
    const onFinishSpy = vi.fn();

    const result = streamText({
      model,
      system: "test",
      messages: await convertToModelMessages(messages),
    });

    const response = result.toUIMessageStreamResponse({
      originalMessages: messages,
      onFinish: ({ responseMessage }) => {
        onFinishSpy(responseMessage);
      },
      sendReasoning: true,
      sendSources: true,
    });

    // Consume the stream to trigger onFinish
    const body = response.body;
    expect(body).not.toBeNull();
    const reader = (body as ReadableStream).getReader();
    let done = false;
    while (!done) {
      const chunk = await reader.read();
      done = chunk.done;
    }

    expect(onFinishSpy).toHaveBeenCalledTimes(1);
    const responseMessage = onFinishSpy.mock.calls[0][0];
    expect(responseMessage.role).toBe("assistant");
  });

  it("messageMetadata provides pending and success statuses", async () => {
    const model = new MockLanguageModelV3({
      doStream: () => ({
        stream: simulateReadableStream({
          initialDelayInMs: null,
          chunkDelayInMs: null,
          chunks: makeTextStreamChunks("Response"),
        }),
      }),
    });

    const messages = [makeUserMessage("Hello")];
    const startTime = Date.now();

    const result = streamText({
      model,
      system: "test",
      messages: await convertToModelMessages(messages),
    });

    const response = result.toUIMessageStreamResponse({
      originalMessages: messages,
      messageMetadata: ({ part }) => {
        if (part.type === "start") {
          return {
            createdAt: new Date(startTime).toISOString(),
            status: "pending",
          };
        }
        if (part.type === "finish") {
          return {
            createdAt: new Date(startTime).toISOString(),
            status: "success",
            usage: part.totalUsage,
            responseTime: Date.now() - startTime,
          };
        }
      },
    });

    // Consume stream
    const body = response.body;
    expect(body).not.toBeNull();
    const reader = (body as ReadableStream).getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    let done = false;
    while (!done) {
      const chunk = await reader.read();
      done = chunk.done;
      if (chunk.value) {
        fullText += decoder.decode(chunk.value, { stream: true });
      }
    }

    expect(fullText).toContain('"status":"pending"');
    expect(fullText).toContain('"status":"success"');
  });
});
