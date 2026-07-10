"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  createDocumentSchema,
  createSuccessorSchema,
  depositCreditSchema,
  ListDocumentsQuery,
  lineItemInputSchema,
  recordPaymentSchema,
  redeemCreditByReferenceSchema,
  redeemCreditSchema,
  updateLineItemSchema,
} from "@workspace/contract/transaction";
import type { Document, DocumentType, LineItem } from "@workspace/db/schema";
import { toast } from "@workspace/ui/components/shadcn/sonner";
import type { InferResponseType } from "hono/client";
import type { z } from "zod";
import { client } from "@/lib/client";

export type DocumentsListParams = Omit<ListDocumentsQuery, never> & {
  page?: number;
  pageSize?: number;
  sortOrder?: "asc" | "desc";
};

export type DocumentRow = InferResponseType<
  (typeof client.protected.documents)["$get"],
  200
>["data"][number];

export const getDocumentsKey = () => ["documents"];
export const getDocumentsListKey = (params: DocumentsListParams) => [
  "documents",
  "list",
  params,
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

/** Entity-detail helper: all docs for one entity (first page, large). */
export const useDocuments = (type?: DocumentType, entityId?: string) =>
  useQuery({
    queryKey: getDocumentsListKey({
      page: 1,
      pageSize: 100,
      sortOrder: "desc",
      ...(type && { type }),
      ...(entityId && { entityId }),
    }),
    queryFn: async () => {
      const res = await client.protected.documents.$get({
        query: {
          page: "1",
          pageSize: "100",
          sortOrder: "desc",
          ...(type && { type }),
          ...(entityId && { entityId }),
        },
      });
      return res.json();
    },
  });

export const useDocumentsList = (
  params: DocumentsListParams,
  options?: { enabled?: boolean }
) =>
  useQuery({
    queryKey: getDocumentsListKey(params),
    queryFn: async () => {
      const res = await client.protected.documents.$get({
        query: {
          page: String(params.page ?? 1),
          pageSize: String(params.pageSize ?? 20),
          ...(params.sortBy && { sortBy: params.sortBy }),
          sortOrder: params.sortOrder ?? "desc",
          ...(params.search && { search: params.search }),
          ...(params.type && { type: params.type }),
          ...(params.direction && { direction: params.direction }),
          ...(params.status && { status: params.status }),
          ...(params.entityId && { entityId: params.entityId }),
        },
      });
      return res.json();
    },
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });

export const useDocument = (id: string) =>
  useQuery({
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
      queryClient.invalidateQueries({ queryKey: getDocumentsKey() });
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
    },
    onError: () => {
      toast.error("Failed to add line");
    },
  });
};

export const useUpdateLineItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      lineId: string;
      data: z.infer<typeof updateLineItemSchema>;
    }) => {
      const res = await client.protected.documents[":id"].lines[":lineId"].$put(
        {
          param: { id: params.id, lineId: params.lineId },
          json: params.data,
        }
      );
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error || "Failed to update line");
      }
      return (await res.json()) as LineItem;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: getDocumentKey(variables.id),
      });
    },
    onError: () => {
      toast.error("Failed to update line");
    },
  });
};

export const useRemoveLineItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; lineId: string }) => {
      const res = await client.protected.documents[":id"].lines[
        ":lineId"
      ].$delete({
        param: { id: params.id, lineId: params.lineId },
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error || "Failed to remove line");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: getDocumentKey(variables.id),
      });
    },
    onError: () => {
      toast.error("Failed to remove line");
    },
  });
};

export const useAcceptDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await client.protected.documents[":id"].accept.$post({
        param: { id },
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error || "Failed to accept");
      }
      return res.json();
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: getDocumentKey(id) });
      queryClient.invalidateQueries({ queryKey: getDocumentsKey() });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      queryClient.invalidateQueries({ queryKey: getActivityKey(id) });
      toast.success("Quote accepted");
    },
    onError: () => {
      toast.error("Failed to accept document");
    },
  });
};

export const useCreateSuccessor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      data: z.infer<typeof createSuccessorSchema>;
    }) => {
      const res = await client.protected.documents[":id"].successor.$post({
        param: { id: params.id },
        json: params.data,
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error || "Failed to create successor");
      }
      return (await res.json()) as DocumentWithLines;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: getDocumentKey(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: getDocumentsKey() });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      queryClient.invalidateQueries({
        queryKey: getActivityKey(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: getActivityKey(data.doc.id),
      });
      queryClient.invalidateQueries({
        queryKey: getDocumentKey(data.doc.id),
      });
      toast.success(
        variables.data.type === "credit_note"
          ? "Credit note created"
          : "Invoice draft created"
      );
    },
    onError: () => {
      toast.error("Failed to create successor");
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
      queryClient.invalidateQueries({ queryKey: getDocumentsKey() });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      toast.success("Document finalized");
    },
    onError: () => {
      toast.error("Failed to finalize document");
    },
  });
};

export const useApplyDisposition = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      disposition: "cash_refund" | "store_credit" | "apply_to_document";
      targetDocumentId?: string;
    }) => {
      const res = await client.protected.documents[":id"].disposition.$post({
        param: { id: params.id },
        json: {
          disposition: params.disposition,
          ...(params.targetDocumentId && {
            targetDocumentId: params.targetDocumentId,
          }),
        },
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error || "Failed to apply disposition");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: getDocumentKey(variables.id),
      });
      if (variables.targetDocumentId) {
        queryClient.invalidateQueries({
          queryKey: getDocumentKey(variables.targetDocumentId),
        });
      }
      queryClient.invalidateQueries({ queryKey: getDocumentsKey() });
      queryClient.invalidateQueries({ queryKey: ["entities"] });
      toast.success("Disposition applied");
    },
    onError: () => {
      toast.error("Failed to apply disposition");
    },
  });
};

export const useActivity = (entityId?: string) =>
  useQuery({
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
      queryClient.invalidateQueries({ queryKey: getDocumentsKey() });
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
      queryClient.invalidateQueries({ queryKey: getDocumentsKey() });
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
