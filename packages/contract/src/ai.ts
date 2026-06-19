import type { LanguageModelUsage } from "ai";
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

export const aiDataPartSchema = z.object({});

export type AIDataPart = z.infer<typeof aiDataPartSchema>;

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
