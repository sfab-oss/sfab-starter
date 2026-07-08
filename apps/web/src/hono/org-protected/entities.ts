import { zValidator } from "@hono/zod-validator";
import {
  createEntitySchema,
  listEntitiesQuerySchema,
  updateEntitySchema,
} from "@workspace/contract/transaction";
import { DomainError } from "@workspace/core/errors";
import {
  archiveEntity,
  createEntity,
  getEntity,
  getPaginatedEntities,
  updateEntity,
} from "@workspace/core/transaction";
import { Hono } from "hono";
import { z } from "zod";
import { requirePermission } from "../middleware/auth";
import type { HonoContextWithAuthAndOrg } from "../types";

const idSchema = z.object({ id: z.string() });

function domainErrorStatus(error: DomainError): 404 | 409 | 422 {
  if (error.code === "not_found") {
    return 404;
  }
  if (error.code === "conflict") {
    return 409;
  }
  return 422;
}

export const entitiesRoute = new Hono<HonoContextWithAuthAndOrg>()
  .get("/", zValidator("query", listEntitiesQuerySchema), async (c) => {
    const orgId = c.get("session").activeOrganizationId;
    const params = c.req.valid("query");
    const data = await getPaginatedEntities(orgId, params);
    return c.json(data);
  })
  .get("/:id", zValidator("param", idSchema), async (c) => {
    const orgId = c.get("session").activeOrganizationId;
    const { id } = c.req.valid("param");
    const data = await getEntity(id, orgId);
    if (!data) {
      return c.json({ error: "Entity not found" }, 404);
    }
    return c.json(data);
  })
  .post(
    "/",
    requirePermission("document:write"),
    zValidator("json", createEntitySchema),
    async (c) => {
      const orgId = c.get("session").activeOrganizationId;
      const body = c.req.valid("json");
      const entity = await createEntity(orgId, body);
      return c.json(entity);
    }
  )
  .put(
    "/:id",
    requirePermission("document:write"),
    zValidator("param", idSchema),
    zValidator("json", updateEntitySchema),
    async (c) => {
      const orgId = c.get("session").activeOrganizationId;
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      try {
        const entity = await updateEntity(id, orgId, body);
        return c.json(entity);
      } catch (error) {
        if (error instanceof DomainError) {
          return c.json({ error: error.message }, domainErrorStatus(error));
        }
        throw error;
      }
    }
  )
  .post(
    "/:id/archive",
    requirePermission("document:write"),
    zValidator("param", idSchema),
    async (c) => {
      const orgId = c.get("session").activeOrganizationId;
      const { id } = c.req.valid("param");
      try {
        const entity = await archiveEntity(id, orgId);
        return c.json(entity);
      } catch (error) {
        if (error instanceof DomainError) {
          return c.json({ error: error.message }, domainErrorStatus(error));
        }
        throw error;
      }
    }
  );
