import { env } from "cloudflare:workers";
import { db, member } from "@workspace/db";
import { sendMail } from "@workspace/email";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { eq } from "drizzle-orm";
import { ac, roles } from "./access-control";

function authOrigin(baseUrl: string): string {
  return new URL(baseUrl).origin;
}

function createAuth() {
  const origin = authOrigin(env.BETTER_AUTH_URL);

  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    basePath: "/api/auth",
    database: drizzleAdapter(db, {
      provider: "sqlite",
    }),
    secret: env.BETTER_AUTH_SECRET,
    emailAndPassword: {
      enabled: true,
      sendResetPassword: ({ user, url }) =>
        sendMail(user.email, "password-reset", {
          resetLink: url,
          username: user.name || user.email,
        }),
    },
    plugins: [
      organization({
        ac,
        roles,
        async sendInvitationEmail(data) {
          const inviteLink = `${origin}/accept-invitation/${data.id}`;
          await sendMail(data.email, "organization-invitation", {
            inviteLink,
            username: data.email,
            invitedByUsername: data.inviter.user.name,
            invitedByEmail: data.inviter.user.email,
            organizationName: data.organization.name,
          });
        },
      }),
      tanstackStartCookies(),
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
}

type AuthInstance = ReturnType<typeof createAuth>;

let authInstance: AuthInstance | undefined;

function getAuth(): AuthInstance {
  authInstance ??= createAuth();
  return authInstance;
}

export const auth: AuthInstance = new Proxy({} as AuthInstance, {
  get(_target, property, receiver) {
    const instance = getAuth();
    const value = Reflect.get(instance, property, receiver);
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});

export type Auth = AuthInstance;
export type Organization = AuthInstance["$Infer"]["Organization"];
export type Member = AuthInstance["$Infer"]["Member"];
export type Invitation = AuthInstance["$Infer"]["Invitation"];
