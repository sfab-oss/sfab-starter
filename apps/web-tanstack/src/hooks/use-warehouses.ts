"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  createWarehouseSchema,
  updateWarehouseSchema,
} from "@workspace/types/warehouses";
import type { z } from "zod";
import { client } from "@/lib/client";

export const getWarehousesKey = () => ["warehouses"];
export const getWarehouseKey = (id: string) => ["warehouses", id];

export const useWarehouses = () => {
  return useQuery({
    queryKey: getWarehousesKey(),
    queryFn: async () => {
      const res = await client.protected.inventory.warehouses.$get();
      return res.json();
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
    },
  });
};
