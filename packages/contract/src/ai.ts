import type { LanguageModelUsage, UIMessage } from "ai";
import { z } from "zod";

export const aiMetadataSchema = z.object({
  createdAt: z.iso.datetime(),
  status: z.enum(["pending", "success", "error"]),
  modelId: z.string().optional(),
  usage: z.custom<LanguageModelUsage>().optional(),
  responseTime: z.number().optional(),
  summaryText: z.string().optional(),
  pageContext: z
    .object({
      page: z.string(),
      params: z.object({
        entityType: z.string().optional(),
        entityId: z.string().optional(),
        title: z.string().optional(),
      }),
    })
    .optional(),
});

export type AIMetadata = z.infer<typeof aiMetadataSchema>;

export const querySchema = z.object({});

export const aiDataPartSchema = z.object({});

export type AIDataPart = z.infer<typeof aiDataPartSchema>;

export type BaseAIUIMessage = UIMessage<AIMetadata, AIDataPart>;

export const skillDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  content: z.string(),
  availableTools: z.array(z.string()),
});

export type SkillDefinition = z.infer<typeof skillDefinitionSchema>;

export type ChatProcessingStatus = "idle" | "processing" | "failed";

export interface ChatContext {
  route: {
    pathname: string;
    params?: Record<string, string>;
  };
  page?: {
    title?: string;
    description?: string;
    entityType?: string;
    entityId?: string;
    data?: Record<string, unknown>;
  };
}

export const agentConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  personality: z.string(),
  systemPrompt: z.function({
    input: z.tuple([z.custom<ChatContext>(), z.custom<string[]>()]),
    output: z.string(),
  }),
  skills: z.object({
    defaultLoaded: z.array(z.string()),
    availableCalled: z.array(z.string()),
  }),
  model: z.object({
    modelId: z.string(),
    providerOptions: z.any().optional(),
  }),
});

export type AgentConfig = z.infer<typeof agentConfigSchema>;
