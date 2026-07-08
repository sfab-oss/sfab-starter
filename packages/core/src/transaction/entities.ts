import type {
  CreateEntityInput,
  ListEntitiesQuery,
  UpdateEntityInput,
} from "@workspace/contract/transaction";
import { createId, db } from "@workspace/db";
import type { Entity } from "@workspace/db/schema";
import { entities } from "@workspace/db/schema";
import { and, asc, desc, eq, isNull, like, sql } from "drizzle-orm";
import { DomainError } from "../errors";
import {
  buildPaginatedResponse,
  getPaginationOffsetLimit,
} from "../pagination";

/**
 * Entity (counterparty) CRUD — the entity carries the cached AR `balance`
 * projection and an optional `creditLimit` (§8). Soft-archive via `archivedAt`
 * (null = active); never hard-delete entities referenced by documents.
 *
 * @see docs/architecture/transaction-core.md §4, §8
 */

const entitySortColumns = {
  name: entities.name,
  type: entities.type,
  balance: entities.balance,
  createdAt: entities.createdAt,
} as const;

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
    .where(and(eq(entities.organizationId, orgId), isNull(entities.archivedAt)))
    .orderBy(desc(entities.createdAt));
}

export async function getPaginatedEntities(
  orgId: string,
  params: ListEntitiesQuery
) {
  const { offset, limit } = getPaginationOffsetLimit(params);

  const conditions = [eq(entities.organizationId, orgId)];
  if (!params.includeArchived) {
    conditions.push(isNull(entities.archivedAt));
  }
  if (params.type) {
    conditions.push(eq(entities.type, params.type));
  }
  if (params.search) {
    conditions.push(like(entities.name, `%${params.search}%`));
  }
  const whereClause = and(...conditions);

  const countResult = await db
    .select({ total: sql<number>`count(*)`.mapWith(Number) })
    .from(entities)
    .where(whereClause);
  const total = countResult[0]?.total ?? 0;

  const sortColumn =
    params.sortBy && params.sortBy in entitySortColumns
      ? entitySortColumns[params.sortBy as keyof typeof entitySortColumns]
      : null;
  const dirFn = params.sortOrder === "desc" ? desc : asc;
  const sortTarget = sortColumn ?? entities.name;

  const data = await db
    .select()
    .from(entities)
    .where(whereClause)
    .orderBy(dirFn(sortTarget))
    .limit(limit)
    .offset(offset);

  return buildPaginatedResponse(data, total, params);
}

export async function updateEntity(
  id: string,
  orgId: string,
  input: UpdateEntityInput
): Promise<Entity> {
  const existing = await getEntity(id, orgId);
  if (!existing) {
    throw new DomainError(`Entity not found: ${id}`, "not_found");
  }
  if (existing.archivedAt) {
    throw new DomainError("Cannot update an archived entity", "conflict");
  }

  const [updated] = await db
    .update(entities)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.creditLimit !== undefined && {
        creditLimit: input.creditLimit,
      }),
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(entities.id, id), eq(entities.organizationId, orgId)))
    .returning();

  if (!updated) {
    throw new DomainError(`Entity not found: ${id}`, "not_found");
  }
  return updated;
}

export async function archiveEntity(
  id: string,
  orgId: string
): Promise<Entity> {
  const existing = await getEntity(id, orgId);
  if (!existing) {
    throw new DomainError(`Entity not found: ${id}`, "not_found");
  }
  if (existing.archivedAt) {
    return existing;
  }

  const now = new Date().toISOString();
  const [archived] = await db
    .update(entities)
    .set({ archivedAt: now, updatedAt: now })
    .where(and(eq(entities.id, id), eq(entities.organizationId, orgId)))
    .returning();

  if (!archived) {
    throw new DomainError(`Entity not found: ${id}`, "not_found");
  }
  return archived;
}
