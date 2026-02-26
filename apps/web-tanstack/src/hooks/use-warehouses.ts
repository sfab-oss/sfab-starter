import { client } from "@/lib/client";

export const getWarehousesKey = () => ["warehouses"] as const;
export const getWarehouseKey = (id: string) => ["warehouses", id] as const;

export async function getWarehouses() {
  const response = await client.protected.inventory.warehouses.$get();
  if (!response.ok) {
    throw new Error("Failed to fetch warehouses");
  }
  return response.json();
}

export async function getWarehouse(id: string) {
  const response = await client.protected.inventory.warehouses[":id"].$get({
    param: { id },
  });
  if (!response.ok) {
    throw new Error("Failed to fetch warehouse");
  }
  return response.json();
}

export async function createWarehouse(data: {
  name: string;
  location?: string;
}) {
  const response = await client.protected.inventory.warehouses.$post({
    json: data,
  });
  if (!response.ok) {
    throw new Error("Failed to create warehouse");
  }
  return response.json();
}

export async function updateWarehouse(
  id: string,
  data: Partial<{
    name: string;
    location: string;
  }>
) {
  const response = await client.protected.inventory.warehouses[":id"].$put({
    param: { id },
    json: data,
  });
  if (!response.ok) {
    throw new Error("Failed to update warehouse");
  }
  return response.json();
}

export async function deleteWarehouse(id: string) {
  const response = await client.protected.inventory.warehouses[":id"].$delete({
    param: { id },
  });
  if (!response.ok) {
    throw new Error("Failed to delete warehouse");
  }
  return response.json();
}
