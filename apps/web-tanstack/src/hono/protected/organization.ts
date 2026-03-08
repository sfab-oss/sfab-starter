import { zValidator } from "@hono/zod-validator";
import { db } from "@workspace/db-d1";
import { Hono } from "hono";
import { z } from "zod";
import { extractAuth, requireAuth } from "../middleware/auth";
import type { HonoContextWithAuth } from "../types";

const checkSlugSchema = z.object({
  slug: z.string().min(3).max(50),
});

const getUserMembershipRoute = new Hono<HonoContextWithAuth>().get(
  "/",
  async (c) => {
    const userId = c.get("user").id;
    const membership = await db.query.member.findFirst({
      where: (member, { eq }) => eq(member.userId, userId),
      with: {
        organization: true,
      },
    });
    return c.json(membership);
  }
);

const checkSlugRoute = new Hono<HonoContextWithAuth>()
  .use(extractAuth)
  .post("/", zValidator("json", checkSlugSchema), async (c) => {
    const { slug } = c.req.valid("json");
    const existingOrg = await db.query.organization.findFirst({
      where: (org, { eq }) => eq(org.slug, slug),
    });
    return c.json({ available: !existingOrg });
  });

const getInvitationRoute = new Hono<HonoContextWithAuth>()
  .use(extractAuth)
  .get("/:id", async (c) => {
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

const getMembersRoute = new Hono<HonoContextWithAuth>().get("/", async (c) => {
  const organizationId = c.get("session").activeOrganizationId;
  if (!organizationId) {
    return c.json({ error: "No active organization" }, 400);
  }

  const members = await db.query.member.findMany({
    where: (member, { eq }) => eq(member.organizationId, organizationId),
    with: {
      user: true,
    },
  });
  return c.json(members);
});

export const organizationRoutes = new Hono()
  .use("*", extractAuth)
  .use("*", requireAuth)
  .route("/membership", getUserMembershipRoute)
  .route("/check-slug", checkSlugRoute)
  .route("/invitation", getInvitationRoute)
  .route("/members", getMembersRoute);
