import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email({ message: "Enter a valid email" }),
  password: z.string().min(1, { message: "Password is required" }),
});

export type SignInValues = z.infer<typeof signInSchema>;
