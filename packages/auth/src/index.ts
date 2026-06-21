import { env } from "cloudflare:workers";
import { db, member } from "@workspace/db";
import { sendMail } from "@workspace/email";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { eq } from "drizzle-orm";
import { ac, roles } from "./access-control";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  basePath: "/api/auth",
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  secret: env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    tanstackStartCookies(),
    organization({
      // RBAC spine: fixed owner/admin/operator roles. `dynamicAccessControl` is
      // intentionally left OFF (the plugin default) — orgs cannot invent roles
      // at runtime. See packages/auth/src/access-control.ts.
      ac,
      roles,
      async sendInvitationEmail(data) {
        const inviteLink = `${env.BETTER_AUTH_URL}/accept-invitation/${data.id}`;
        await sendMail(data.email, "organization-invitation", {
          inviteLink,
          username: data.email,
          invitedByUsername: data.inviter.user.name,
          invitedByEmail: data.inviter.user.email,
          organizationName: data.organization.name,
        });
      },
    }),
  ],
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const membership = await db.query.member.findFirst({
            where: eq(member.userId, session.userId),
          });

          return {
            data: {
              ...session,
              activeOrganizationId: membership?.organizationId ?? null,
            },
          };
        },
      },
    },
  },
});

export type Auth = typeof auth;
export type Organization = typeof auth.$Infer.Organization;
export type Member = typeof auth.$Infer.Member;
export type Invitation = typeof auth.$Infer.Invitation;
