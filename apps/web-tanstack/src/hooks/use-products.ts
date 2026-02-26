import { client } from "@/lib/client";

export const getProductsKey = () => ["products"] as const;
export const getProductKey = (id: string) => ["products", id] as const;

export async function getProducts() {
  const response = await client.protected.inventory.products.$get();
  if (!response.ok) {
    throw new Error("Failed to fetch products");
  }
  return response.json();
}

export async function getProduct(id: string) {
  const response = await client.protected.inventory.products[":id"].$get({
    param: { id },
  });
  if (!response.ok) {
    throw new Error("Failed to fetch product");
  }
  return response.json();
}

export async function createProduct(data: {
  sku: string;
  name: string;
  description?: string;
  price?: string;
  cost?: string;
  minStockLevel?: number;
  imageUrl?: string;
}) {
  const response = await client.protected.inventory.products.$post({
    json: data,
  });
  if (!response.ok) {
    throw new Error("Failed to create product");
  }
  return response.json();
}

export async function updateProduct(
  id: string,
  data: Partial<{
    sku: string;
    name: string;
    description: string;
    price: string;
    cost: string;
    minStockLevel: number;
    imageUrl: string;
  }>
) {
  const response = await client.protected.inventory.products[":id"].$put({
    param: { id },
    json: data,
  });
  if (!response.ok) {
    throw new Error("Failed to update product");
  }
  return response.json();
}

export async function deleteProduct(id: string) {
  const response = await client.protected.inventory.products[":id"].$delete({
    param: { id },
  });
  if (!response.ok) {
    throw new Error("Failed to delete product");
  }
  return response.json();
}
