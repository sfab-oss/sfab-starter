import { type InferUITool, tool } from "ai";
import { z } from "zod";

const showMessageParamsSchema = z.object({
  message: z.string().describe("The message to show."),
});

export type ShowMessageParams = z.infer<typeof showMessageParamsSchema>;

const showMessageResultSchema = z.union([
  z.object({
    success: z.literal(true),
  }),
  z.object({
    success: z.literal(false),
    error: z.string(),
  }),
]);

export type ShowMessageResult = z.infer<typeof showMessageResultSchema>;

export const showMessageTool = tool({
  description: "Show a message to the user.",
  inputSchema: showMessageParamsSchema,
  outputSchema: showMessageResultSchema,
});

export type ShowMessageTool = InferUITool<typeof showMessageTool>;
