import { db } from "@workspace/db/client";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { authEnv } from "./env";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  secret: authEnv.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
  },
  // Add other providers or plugins here as needed
});

export type Auth = typeof auth;
