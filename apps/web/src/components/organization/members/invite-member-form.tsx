"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "@workspace/auth/client";
import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/shadcn/field";
import { Input } from "@workspace/ui/components/shadcn/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/shadcn/select";
import { toast } from "@workspace/ui/components/shadcn/sonner";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { useInviteMember } from "@/hooks/use-organization";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  role: z.enum(["member", "admin", "owner"]),
});

type InviteMemberData = z.infer<typeof formSchema>;

const ROLE_HIERARCHY = {
  owner: 2,
  admin: 1,
  member: 0,
} as const;

interface InviteMemberFormProps {
  className?: string;
  onSuccess?: () => void;
}

export function InviteMemberForm({
  className,
  onSuccess,
}: InviteMemberFormProps) {
  const inviteMember = useInviteMember();
  const { data: activeMember } = authClient.useActiveMember();

  const form = useForm<InviteMemberData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      role: "member",
    },
  });

  async function onSubmit(values: InviteMemberData) {
    if (!activeMember) {
      toast.error("Unable to determine your permissions");
      return;
    }

    const currentRole = activeMember.role as keyof typeof ROLE_HIERARCHY;
    const targetRole = values.role;

    if (
      currentRole !== "owner" &&
      ROLE_HIERARCHY[currentRole] < ROLE_HIERARCHY[targetRole]
    ) {
      toast.error(`As a ${currentRole}, you can't invite a ${targetRole}`);
      return;
    }

    try {
      await inviteMember.mutateAsync(values);
      toast.success("Member invited successfully");
      form.reset();
      onSuccess?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to invite member"
      );
    }
  }

  const canInviteOwner = activeMember?.role === "owner";

  return (
    <form className={className} onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <div className="flex gap-2">
          <Controller
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <Field className="flex-1" data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                <Input
                  {...field}
                  aria-invalid={fieldState.invalid}
                  id={field.name}
                  placeholder="elon@spacex.com"
                  type="email"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="role"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Role</FieldLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger id={field.name}>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {canInviteOwner && (
                      <SelectItem value="owner">Owner</SelectItem>
                    )}
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                  </SelectContent>
                </Select>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </div>
        <Field>
          <Button
            className="w-full"
            disabled={inviteMember.isPending}
            type="submit"
          >
            {inviteMember.isPending ? "Inviting..." : "Send Invitation"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
