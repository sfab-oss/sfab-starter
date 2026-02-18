import { createEnv } from "@t3-oss/env-nextjs";
import { authEnv } from "@workspace/auth/env";
import { configEnv } from "@workspace/config/env";
import { dbEnv } from "@workspace/db/env";
import { z } from "zod";

export const env = createEnv({
  extends: [dbEnv, authEnv, configEnv],

  server: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
  },

  client: {
    NEXT_PUBLIC_DESIGN_SYSTEM_ENABLED: z
      .string()
      .transform((val) => val === "true")
      .default(false),
  },

  experimental__runtimeEnv: {
    NEXT_PUBLIC_DESIGN_SYSTEM_ENABLED:
      process.env.NEXT_PUBLIC_DESIGN_SYSTEM_ENABLED,
  },

  emptyStringAsUndefined: true,
});
