import type { CreateEntityInput } from "@workspace/contract/transaction";
import { createId, db } from "@workspace/db";
import type { Entity } from "@workspace/db/schema";
import { entities } from "@workspace/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { DomainError } from "../errors";

/**
 * Entity (counterparty) CRUD — the entity carries the cached AR `balance`
 * projection and an optional `creditLimit` (§8).
 *
 * @see docs/architecture/transaction-core.md §4, §8
 */

export async function createEntity(
  orgId: string,
  input: CreateEntityInput
): Promise<Entity> {
  const [entity] = await db
    .insert(entities)
    .values({
      id: createId("ent"),
      organizationId: orgId,
      name: input.name,
      type: input.type,
      creditLimit: input.creditLimit ?? null,
    })
    .returning();
  if (!entity) {
    throw new DomainError("Failed to create entity", "unprocessable");
  }
  return entity;
}

export async function getEntity(
  id: string,
  orgId: string
): Promise<Entity | null> {
  const [entity] = await db
    .select()
    .from(entities)
    .where(and(eq(entities.id, id), eq(entities.organizationId, orgId)));
  return entity ?? null;
}

export async function listEntities(orgId: string): Promise<Entity[]> {
  return await db
    .select()
    .from(entities)
    .where(eq(entities.organizationId, orgId))
    .orderBy(desc(entities.createdAt));
}
