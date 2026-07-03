import { zValidator } from "@hono/zod-validator";
import { createEntitySchema } from "@workspace/contract/transaction";
import {
  createEntity,
  getEntity,
  listEntities,
} from "@workspace/core/transaction";
import { Hono } from "hono";
import { z } from "zod";
import { requirePermission } from "../middleware/auth";
import { domainErrorHandler } from "../middleware/domain-error";
import type { HonoContextWithAuthAndOrg } from "../types";

const idSchema = z.object({ id: z.string() });

export const entitiesRoute = new Hono<HonoContextWithAuthAndOrg>()
  .onError(domainErrorHandler)
  .get("/", async (c) => {
    const orgId = c.get("session").activeOrganizationId;
    const data = await listEntities(orgId);
    return c.json({ data });
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
  );
