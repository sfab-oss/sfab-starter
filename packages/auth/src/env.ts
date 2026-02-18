import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const authEnv = createEnv({
  server: {
    BETTER_AUTH_SECRET: z.string().min(32),
  },
  // Remove client section - Vercel vars moved to @workspace/config
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
