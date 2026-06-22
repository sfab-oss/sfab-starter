import { z } from "zod";

export const organizationDetailsSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Name must be at least 2 characters" })
    .max(100, { message: "Name must be less than 100 characters" }),
  slug: z
    .string()
    .min(2, { message: "Slug must be at least 2 characters" })
    .max(50, { message: "Slug must be less than 50 characters" })
    .regex(/^[a-z0-9-]+$/, {
      message: "Slug can only contain lowercase letters, numbers, and hyphens",
    }),
});

export type OrganizationDetailsValues = z.infer<
  typeof organizationDetailsSchema
>;

export const inviteMemberSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  role: z.enum(["member", "admin", "owner"]),
});

export type InviteMemberValues = z.infer<typeof inviteMemberSchema>;
