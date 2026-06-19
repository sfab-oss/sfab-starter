"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  createWarehouseSchema,
  updateWarehouseSchema,
} from "@workspace/contract/catalog";
import type { PaginationQuery } from "@workspace/contract/pagination";
import { toast } from "@workspace/ui/components/shadcn/sonner";
import type { z } from "zod";
import { client } from "@/lib/client";

export const getWarehousesKey = () => ["warehouses"];
export const getWarehousesListKey = (params: PaginationQuery) => [
  "warehouses",
  "list",
  params,
];
export const getWarehouseKey = (id: string) => ["warehouses", id];

export const useWarehouses = (params: PaginationQuery) => {
  return useQuery({
    queryKey: getWarehousesListKey(params),
    queryFn: async () => {
      const res = await client.protected.inventory.warehouses.$get({
        query: {
          page: params.page.toString(),
          pageSize: params.pageSize.toString(),
          ...(params.sortBy && { sortBy: params.sortBy }),
          sortOrder: params.sortOrder,
          ...(params.search && { search: params.search }),
        },
      });
      return res.json();
    },
    placeholderData: keepPreviousData,
  });
};

export const useAllWarehouses = () => {
  return useQuery({
    queryKey: [...getWarehousesKey(), "all"],
    queryFn: async () => {
      const res = await client.protected.inventory.warehouses.$get({
        query: { page: "1", pageSize: "100", sortOrder: "asc" },
      });
      const result = await res.json();
      return result.data;
    },
  });
};

export const useWarehouse = (id: string) => {
  return useQuery({
    queryKey: getWarehouseKey(id),
    queryFn: async () => {
      const res = await client.protected.inventory.warehouses[":id"].$get({
        param: { id },
      });
      if (!res.ok) {
        throw new Error("Warehouse not found");
      }
      return res.json();
    },
    enabled: !!id,
  });
};

export const useCreateWarehouse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof createWarehouseSchema>) => {
      const res = await client.protected.inventory.warehouses.$post({
        json: data,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getWarehousesKey() });
      toast.success("Warehouse created");
    },
    onError: () => {
      toast.error("Failed to create warehouse");
    },
  });
};

export const useUpdateWarehouse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      data: z.infer<typeof updateWarehouseSchema>;
    }) => {
      const res = await client.protected.inventory.warehouses[":id"].$put({
        param: { id: params.id },
        json: params.data,
      });
      if (!res.ok) {
        throw new Error("Failed to update warehouse");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: getWarehousesKey() });
      queryClient.invalidateQueries({
        queryKey: getWarehouseKey(variables.id),
      });
      toast.success("Warehouse updated");
    },
    onError: () => {
      toast.error("Failed to update warehouse");
    },
  });
};

export const useDeleteWarehouse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await client.protected.inventory.warehouses[":id"].$delete({
        param: { id },
      });
      if (!res.ok) {
        throw new Error("Failed to delete warehouse");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getWarehousesKey() });
      toast.success("Warehouse deleted");
    },
    onError: () => {
      toast.error("Failed to delete warehouse");
    },
  });
};
