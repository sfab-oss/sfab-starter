import { db } from "@workspace/db";
// biome-ignore lint/performance/noNamespaceImport: Schema barrel export
import * as schema from "@workspace/db/schema";

export async function seedUser(
  overrides?: Partial<typeof schema.user.$inferInsert>
) {
  const id = overrides?.id ?? crypto.randomUUID();
  const [user] = await db
    .insert(schema.user)
    .values({
      id,
      name: "Test User",
      email: `${id}@test.com`,
      emailVerified: true,
      ...overrides,
    })
    .returning();
  return user;
}

export async function seedOrganization(
  userId: string,
  overrides?: Partial<typeof schema.organization.$inferInsert>
) {
  const orgId = overrides?.id ?? crypto.randomUUID();
  const [org] = await db
    .insert(schema.organization)
    .values({
      id: orgId,
      name: "Test Org",
      slug: `test-org-${orgId.slice(0, 8)}`,
      ...overrides,
    })
    .returning();

  await db.insert(schema.member).values({
    id: crypto.randomUUID(),
    organizationId: orgId,
    userId,
    role: "owner",
  });

  return org;
}

export async function seedProduct(
  orgId: string,
  overrides?: Partial<typeof schema.products.$inferInsert>
) {
  const [product] = await db
    .insert(schema.products)
    .values({
      organizationId: orgId,
      sku: `SKU-${crypto.randomUUID().slice(0, 8)}`,
      name: "Test Product",
      price: 1999,
      minStockLevel: 10,
      ...overrides,
    })
    .returning();
  return product;
}

export async function seedWarehouse(
  orgId: string,
  overrides?: Partial<typeof schema.warehouses.$inferInsert>
) {
  const [warehouse] = await db
    .insert(schema.warehouses)
    .values({
      organizationId: orgId,
      name: "Test Warehouse",
      location: "Test Location",
      isDefault: false,
      ...overrides,
    })
    .returning();
  return warehouse;
}
