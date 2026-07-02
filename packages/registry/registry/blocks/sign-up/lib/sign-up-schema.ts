import { z } from "zod";

export const signUpSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  email: z.string().email({ message: "Enter a valid email" }),
  password: z.string().min(8, { message: "Use at least 8 characters" }),
});

export type SignUpValues = z.infer<typeof signUpSchema>;
