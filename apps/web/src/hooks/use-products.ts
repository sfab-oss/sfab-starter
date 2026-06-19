"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { PaginationQuery } from "@workspace/contract/pagination";
import type {
  createMovementSchema,
  createProductSchema,
  Product,
  updateProductSchema,
} from "@workspace/contract/products";
import { toast } from "@workspace/ui/components/shadcn/sonner";
import type { z } from "zod";
import { client } from "@/lib/client";

export const getProductsKey = () => ["products"];
export const getProductsListKey = (params: PaginationQuery) => [
  "products",
  "list",
  params,
];
export const getProductKey = (id: string) => ["products", id];
export const getProductMovementsKey = (productId: string) => [
  "products",
  productId,
  "movements",
];
export const getInventoryMetricsKey = () => ["inventory", "metrics"];

export const useProducts = (params: PaginationQuery) => {
  return useQuery({
    queryKey: getProductsListKey(params),
    queryFn: async () => {
      const res = await client.protected.inventory.products.$get({
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

export const useProduct = (id: string) => {
  return useQuery({
    queryKey: getProductKey(id),
    queryFn: async () => {
      const res = await client.protected.inventory.products[":id"].$get({
        param: { id },
      });
      if (!res.ok) {
        throw new Error("Product not found");
      }
      return res.json();
    },
    enabled: !!id,
  });
};

export const useInventoryMetrics = () => {
  return useQuery({
    queryKey: getInventoryMetricsKey(),
    queryFn: async () => {
      const res = await client.protected.inventory.metrics.$get();
      return res.json();
    },
  });
};

export const useProductMovements = (productId: string | null) => {
  return useQuery({
    queryKey: getProductMovementsKey(productId ?? ""),
    queryFn: async () => {
      if (!productId) {
        throw new Error("Product ID is required");
      }
      const res = await client.protected.inventory.products[
        ":id"
      ].movements.$get({
        param: { id: productId },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch movements");
      }
      return res.json();
    },
    enabled: !!productId,
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof createProductSchema>) => {
      const res = await client.protected.inventory.products.$post({
        json: data,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getProductsKey() });
      queryClient.invalidateQueries({ queryKey: getInventoryMetricsKey() });
      toast.success("Product created");
    },
    onError: () => {
      toast.error("Failed to create product");
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      data: z.infer<typeof updateProductSchema>;
    }) => {
      const res = await client.protected.inventory.products[":id"].$put({
        param: { id: params.id },
        json: params.data,
      });
      if (!res.ok) {
        throw new Error("Failed to update product");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: getProductsKey() });
      queryClient.invalidateQueries({ queryKey: getProductKey(variables.id) });
      queryClient.invalidateQueries({ queryKey: getInventoryMetricsKey() });
      toast.success("Product updated");
    },
    onError: () => {
      toast.error("Failed to update product");
    },
  });
};

interface PaginatedProducts {
  data: Product[];
  total: number;
  page: number;
  pageSize: number;
}

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await client.protected.inventory.products[":id"].$delete({
        param: { id },
      });
      if (!res.ok) {
        throw new Error("Failed to delete product");
      }
      return res.json();
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: getProductsKey() });

      const previousLists = queryClient.getQueriesData<PaginatedProducts>({
        queryKey: ["products", "list"],
      });

      queryClient.setQueriesData<PaginatedProducts>(
        { queryKey: ["products", "list"] },
        (old) => {
          if (!old) {
            return old;
          }
          return {
            ...old,
            data: old.data.filter((p) => p.id !== id),
            total: old.total - 1,
          };
        }
      );

      return { previousLists };
    },
    onError: (_err, _id, context) => {
      if (context?.previousLists) {
        for (const [queryKey, data] of context.previousLists) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      toast.error("Failed to delete product");
    },
    onSuccess: () => {
      toast.success("Product deleted");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: getProductsKey() });
      queryClient.invalidateQueries({ queryKey: getInventoryMetricsKey() });
    },
  });
};

export const useUploadProductImage = () => {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/protected/inventory/uploads", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error((body as { error?: string }).error || "Upload failed");
      }
      return res.json() as Promise<{ key: string }>;
    },
  });
};

export const useDeleteProductImage = () => {
  return useMutation({
    mutationFn: async (key: string) => {
      const res = await client.protected.inventory.uploads[":key"].$delete({
        param: { key },
      });
      if (!res.ok) {
        throw new Error("Failed to delete image");
      }
      return res.json();
    },
  });
};

export const useCreateMovement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof createMovementSchema>) => {
      const res = await client.protected.inventory.movements.$post({
        json: data,
      });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: getProductsKey() });
      queryClient.invalidateQueries({ queryKey: getInventoryMetricsKey() });
      queryClient.invalidateQueries({
        queryKey: getProductMovementsKey(variables.productId),
      });
      toast.success("Stock movement recorded");
    },
    onError: () => {
      toast.error("Failed to record stock movement");
    },
  });
};
