import { z } from "zod";

export const revokeMcpConnectionSchema = z.object({
  clientId: z.string().min(1),
  userId: z.string().min(1).optional(),
});
