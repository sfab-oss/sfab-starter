import { z } from "zod";

export const acceptInviteSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  password: z.string().min(8, { message: "Use at least 8 characters" }),
});

export type AcceptInviteValues = z.infer<typeof acceptInviteSchema>;
