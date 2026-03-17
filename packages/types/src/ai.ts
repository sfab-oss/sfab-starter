import type { LanguageModelUsage, UIMessage } from "ai";
import { z } from "zod";

export const aiMetadataSchema = z.object({
  createdAt: z.iso.datetime(),
  status: z.enum(["pending", "success", "error"]),
  modelId: z.string().optional(),
  usage: z.custom<LanguageModelUsage>().optional(),
  responseTime: z.number().optional(),
  summaryText: z.string().optional(),
});

export type AIMetadata = z.infer<typeof aiMetadataSchema>;

export const querySchema = z.object({});

export const aiDataPartSchema = z.object({});

export type AIDataPart = z.infer<typeof aiDataPartSchema>;

export type BaseAIUIMessage = UIMessage<AIMetadata, AIDataPart>;

// Skill Definition

export const skillDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  content: z.string(),
  availableTools: z.array(z.string()),
});

export type SkillDefinition = z.infer<typeof skillDefinitionSchema>;

// Chat Processing Status

export type ChatProcessingStatus = "idle" | "processing" | "failed";

// Chat Context

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

// Agent Configuration

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
    defaultLoaded: z.array(z.string()), // Skills loaded by default
    availableCalled: z.array(z.string()), // Skills that can be called on demand
  }),
  model: z.object({
    modelId: z.string(),
    providerOptions: z.any().optional(),
  }),
});

export type AgentConfig = z.infer<typeof agentConfigSchema>;
