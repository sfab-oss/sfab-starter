"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  createDocumentSchema,
  depositCreditSchema,
  lineItemInputSchema,
  recordPaymentSchema,
  redeemCreditByReferenceSchema,
  redeemCreditSchema,
} from "@workspace/contract/transaction";
import type { Document, DocumentType, LineItem } from "@workspace/db/schema";
import { toast } from "@workspace/ui/components/shadcn/sonner";
import type { z } from "zod";
import { client } from "@/lib/client";

export const getDocumentsKey = (type?: string, entityId?: string) => [
  "documents",
  type ?? "all",
  entityId ?? "all-entities",
];
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

export const useDocuments = (type?: DocumentType, entityId?: string) => {
  return useQuery({
    queryKey: getDocumentsKey(type, entityId),
    queryFn: async () => {
      const res = await client.protected.documents.$get({
        query: {
          ...(type && { type }),
          ...(entityId && { entityId }),
        },
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

export const useRecordPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      input: z.infer<typeof recordPaymentSchema>;
    }) => {
      const res = await client.protected.payments.$post({ json: data.input });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error || "Failed to record payment");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      for (const alloc of variables.input.allocations) {
        queryClient.invalidateQueries({
          queryKey: getDocumentKey(alloc.documentId),
        });
      }
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast.success("Payment recorded");
    },
    onError: () => {
      toast.error("Failed to record payment");
    },
  });
};

export const useReversePayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; reason?: string }) => {
      const res = await client.protected.payments[":id"].reverse.$post({
        param: { id: params.id },
        json: params.reason ? { reason: params.reason } : {},
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error || "Failed to reverse payment");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      toast.success("Payment reversed");
    },
    onError: () => {
      toast.error("Failed to reverse payment");
    },
  });
};

export const useDepositCredit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: z.infer<typeof depositCreditSchema>) => {
      const res = await client.protected.wallet.deposit.$post({ json: input });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error || "Failed to deposit credit");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entities"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      toast.success("Credit deposited");
    },
    onError: () => {
      toast.error("Failed to deposit credit");
    },
  });
};

export const useRedeemCredit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: z.infer<typeof redeemCreditSchema>) => {
      const res = await client.protected.wallet.redeem.$post({ json: input });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error || "Failed to redeem credit");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: getDocumentKey(variables.documentId),
      });
      queryClient.invalidateQueries({ queryKey: ["entities"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      toast.success("Credit redeemed");
    },
    onError: () => {
      toast.error("Failed to redeem credit");
    },
  });
};

export const useRedeemCreditByReference = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: z.infer<typeof redeemCreditByReferenceSchema>
    ) => {
      const res = await client.protected.wallet["redeem-by-reference"].$post({
        json: input,
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error || "Failed to redeem credit by reference");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: getDocumentKey(variables.documentId),
      });
      queryClient.invalidateQueries({ queryKey: ["entities"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      toast.success("Credit redeemed");
    },
    onError: () => {
      toast.error("Failed to redeem credit");
    },
  });
};
