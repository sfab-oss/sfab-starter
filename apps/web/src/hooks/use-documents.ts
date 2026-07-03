"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  createDocumentSchema,
  lineItemInputSchema,
} from "@workspace/contract/transaction";
import type { Document, DocumentType, LineItem } from "@workspace/db/schema";
import { toast } from "@workspace/ui/components/shadcn/sonner";
import type { z } from "zod";
import { client } from "@/lib/client";

export const getDocumentsKey = (type?: string) => ["documents", type ?? "all"];
export const getDocumentKey = (id: string) => ["documents", id];
export const getActivityKey = (entityId?: string) => [
  "activity",
  entityId ?? "org",
];

export interface DocumentWithLines {
  doc: Document;
  lines: LineItem[];
  draftTotals?: {
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    total: number;
    taxableBase: number;
  };
}

export const useDocuments = (type?: DocumentType) => {
  return useQuery({
    queryKey: getDocumentsKey(type),
    queryFn: async () => {
      const res = await client.protected.documents.$get({
        query: { type },
      });
      return (await res.json()) as { data: Document[] };
    },
  });
};

export const useDocument = (id: string) => {
  return useQuery({
    queryKey: getDocumentKey(id),
    queryFn: async () => {
      const res = await client.protected.documents[":id"].$get({
        param: { id },
      });
      if (!res.ok) {
        throw new Error("Document not found");
      }
      return (await res.json()) as DocumentWithLines;
    },
    enabled: !!id,
  });
};

export const useCreateDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof createDocumentSchema>) => {
      const res = await client.protected.documents.$post({ json: data });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error || "Failed to create document");
      }
      return (await res.json()) as Document;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document created");
    },
    onError: () => {
      toast.error("Failed to create document");
    },
  });
};

export const useAddLineItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      data: z.infer<typeof lineItemInputSchema>;
    }) => {
      const res = await client.protected.documents[":id"].lines.$post({
        param: { id: params.id },
        json: params.data,
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error || "Failed to add line");
      }
      return (await res.json()) as LineItem;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: getDocumentKey(variables.id),
      });
      toast.success("Line added");
    },
    onError: () => {
      toast.error("Failed to add line");
    },
  });
};

export const useFinalizeDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await client.protected.documents[":id"].finalize.$post({
        param: { id },
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error || "Failed to finalize");
      }
      return res.json();
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: getDocumentKey(id) });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      toast.success("Document finalized");
    },
    onError: () => {
      toast.error("Failed to finalize document");
    },
  });
};

export const useActivity = (entityId?: string) => {
  return useQuery({
    queryKey: getActivityKey(entityId),
    queryFn: async () => {
      const res = await client.protected.documents.activity.$get({
        ...(entityId && { query: { entityId } }),
      });
      return (await res.json()) as {
        data: Array<{
          id: string;
          eventType: string | null;
          summary: string | null;
          createdAt: string;
        }>;
      };
    },
  });
};
