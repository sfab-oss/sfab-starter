"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  createEntitySchema,
  ListEntitiesQuery,
  updateEntitySchema,
} from "@workspace/contract/transaction";
import { toast } from "@workspace/ui/components/shadcn/sonner";
import type { InferResponseType } from "hono/client";
import type { z } from "zod";
import { client } from "@/lib/client";

export type Entity = InferResponseType<
  (typeof client.protected.entities)["$get"],
  200
>["data"][number];

export type EntitiesListParams = Omit<ListEntitiesQuery, "includeArchived"> & {
  includeArchived?: boolean;
};

export const getEntitiesKey = () => ["entities"];
export const getEntitiesListKey = (params: EntitiesListParams) => [
  "entities",
  "list",
  params,
];
export const getEntityKey = (id: string) => ["entities", id];

export const useEntities = (
  params: EntitiesListParams,
  options?: { enabled?: boolean }
) =>
  useQuery({
    queryKey: getEntitiesListKey(params),
    queryFn: async () => {
      const res = await client.protected.entities.$get({
        query: {
          page: params.page.toString(),
          pageSize: params.pageSize.toString(),
          ...(params.sortBy && { sortBy: params.sortBy }),
          sortOrder: params.sortOrder,
          ...(params.search && { search: params.search }),
          ...(params.type && { type: params.type }),
          ...(params.includeArchived && { includeArchived: "true" }),
        },
      });
      return res.json();
    },
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });

export const useEntity = (id: string) =>
  useQuery({
    queryKey: getEntityKey(id),
    queryFn: async () => {
      const res = await client.protected.entities[":id"].$get({
        param: { id },
      });
      if (!res.ok) {
        throw new Error("Entity not found");
      }
      return res.json();
    },
    enabled: !!id,
  });

export const useCreateEntity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof createEntitySchema>) => {
      const res = await client.protected.entities.$post({ json: data });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error || "Failed to create entity");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getEntitiesKey() });
      toast.success("Entity created");
    },
    onError: () => {
      toast.error("Failed to create entity");
    },
  });
};

export const useUpdateEntity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      data: z.infer<typeof updateEntitySchema>;
    }) => {
      const res = await client.protected.entities[":id"].$put({
        param: { id: params.id },
        json: params.data,
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error || "Failed to update entity");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: getEntitiesKey() });
      queryClient.invalidateQueries({ queryKey: getEntityKey(variables.id) });
      toast.success("Entity updated");
    },
    onError: () => {
      toast.error("Failed to update entity");
    },
  });
};

export const useArchiveEntity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await client.protected.entities[":id"].archive.$post({
        param: { id },
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error || "Failed to archive entity");
      }
      return res.json();
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: getEntitiesKey() });
      queryClient.invalidateQueries({ queryKey: getEntityKey(id) });
      toast.success("Entity archived");
    },
    onError: () => {
      toast.error("Failed to archive entity");
    },
  });
};
