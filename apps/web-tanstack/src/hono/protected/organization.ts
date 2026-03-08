import { zValidator } from "@hono/zod-validator";
import { db } from "@workspace/db-d1";
import { Hono } from "hono";
import { z } from "zod";
import type { HonoContextWithAuth } from "../types";

const checkSlugSchema = z.object({
  slug: z.string().min(3).max(50),
});

const organizationRoutes = new Hono<HonoContextWithAuth>()
  .get("/membership", async (c) => {
    const userId = c.get("user").id;
    const membership = await db.query.member.findFirst({
      where: (member, { eq }) => eq(member.userId, userId),
      with: {
        organization: true,
      },
    });
    return c.json(membership);
  })
  .post("/check-slug", zValidator("json", checkSlugSchema), async (c) => {
    const { slug } = c.req.valid("json");
    const existingOrg = await db.query.organization.findFirst({
      where: (org, { eq }) => eq(org.slug, slug),
    });
    return c.json({ available: !existingOrg });
  })
  .get("/invitation/:id", async (c) => {
    const invitationId = c.req.param("id");
    const invitation = await db.query.invitation.findFirst({
      where: (inv, { eq }) => eq(inv.id, invitationId),
      with: {
        organization: true,
        inviter: true,
      },
    });
    if (!invitation) {
      return c.json({ error: "Invitation not found" }, 404);
    }
    return c.json(invitation);
  });

export default organizationRoutes;
