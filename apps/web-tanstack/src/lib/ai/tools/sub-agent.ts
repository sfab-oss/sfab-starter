import { tool } from "ai";
import { z } from "zod";

export interface SubAgentToolContext {
  orgId: string;
  chatId: string;
  userId: string;
}

const runAgentInputSchema = z.object({
  prompt: z
    .string()
    .describe("The task description for the sub-agent to execute."),
  mode: z
    .enum(["foreground", "background"])
    .default("foreground")
    .describe(
      "foreground: blocks until done and returns result. background: returns immediately with a child chat ID."
    ),
});

const runAgentOutputSchema = z.union([
  z.object({
    success: z.literal(true),
    mode: z.literal("foreground"),
    childChatId: z.string(),
    output: z.string(),
  }),
  z.object({
    success: z.literal(true),
    mode: z.literal("background"),
    childChatId: z.string(),
    message: z.string(),
  }),
  z.object({
    success: z.literal(false),
    error: z.string(),
  }),
]);

const getTaskResultInputSchema = z.object({
  childChatId: z
    .string()
    .describe("The chat ID of the sub-agent to retrieve results for."),
});

const getTaskResultOutputSchema = z.union([
  z.object({
    found: z.literal(true),
    childChatId: z.string(),
    status: z.string(),
    title: z.string(),
    output: z.string().nullable(),
  }),
  z.object({
    found: z.literal(false),
    error: z.string(),
  }),
]);

const listTasksOutputSchema = z.array(
  z.object({
    childChatId: z.string(),
    title: z.string(),
    status: z.string(),
    createdAt: z.string(),
  })
);

export function createSubAgentTools(context: SubAgentToolContext) {
  const { orgId, chatId, userId } = context;

  // Lazy import to avoid circular dependency (sub-agent.ts imports tools/index.ts)
  const getRunSubAgent = () =>
    import("../sub-agent").then((m) => m.runSubAgent);
  const getChatFns = () => import("@workspace/core/chat");

  return {
    "run-agent": tool({
      description:
        "Spawn a sub-agent to execute a task independently. Use 'foreground' mode (default) for tasks where you need the result immediately. Use 'background' mode for long-running tasks that can complete while the conversation continues.",
      inputSchema: runAgentInputSchema,
      outputSchema: runAgentOutputSchema,
      execute: async ({ prompt, mode }) => {
        try {
          const runSubAgent = await getRunSubAgent();

          if (mode === "foreground") {
            const result = await runSubAgent({
              prompt,
              orgId,
              userId,
              parentChatId: chatId,
              mode: "foreground",
            });

            return {
              success: true as const,
              mode: "foreground" as const,
              childChatId: result.childChatId,
              output: result.output,
            };
          }

          // Background mode: runSubAgent handles waitUntil internally
          const result = await runSubAgent({
            prompt,
            orgId,
            userId,
            parentChatId: chatId,
            mode: "background",
          });

          // The runSubAgent in "background" mode creates the chat and starts
          // agentRespond via waitUntil internally, returning immediately.
          return {
            success: true as const,
            mode: "background" as const,
            childChatId: result.childChatId,
            message: `Background sub-agent started. Chat ID: ${result.childChatId}. You will be notified when it completes.`,
          };
        } catch (error) {
          return {
            success: false as const,
            error:
              error instanceof Error
                ? error.message
                : "Failed to start sub-agent",
          };
        }
      },
    }),

    "get-task-result": tool({
      description:
        "Retrieve the result of a sub-agent by its chat ID. Use this when notified that a background sub-agent has completed.",
      inputSchema: getTaskResultInputSchema,
      outputSchema: getTaskResultOutputSchema,
      execute: async ({ childChatId }) => {
        const { getChat, getLastAssistantMessage } = await getChatFns();
        const chat = await getChat(childChatId);

        if (!chat) {
          return {
            found: false as const,
            error: `Sub-agent chat '${childChatId}' not found.`,
          };
        }

        const output = await getLastAssistantMessage(childChatId);

        return {
          found: true as const,
          childChatId: chat.id,
          status: chat.status,
          title: chat.title,
          output,
        };
      },
    }),

    "list-tasks": tool({
      description:
        "List all sub-agent tasks spawned in this chat, showing their status.",
      inputSchema: z.object({}),
      outputSchema: listTasksOutputSchema,
      execute: async () => {
        const { getChildChats } = await getChatFns();
        const children = await getChildChats(chatId);

        return children.map((child) => ({
          childChatId: child.id,
          title: child.title,
          status: child.status,
          createdAt: child.createdAt,
        }));
      },
    }),
  };
}
