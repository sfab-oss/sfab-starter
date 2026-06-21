"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  can,
  hasRoleRank,
  ROLE_LABELS,
  ROLE_RANK,
  type RoleName,
} from "@workspace/auth/access-control";
import { authClient } from "@workspace/auth/client";
import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Field,
  FieldDescription,
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
  const currentRole = activeMember?.role ?? null;

  // RBAC seam: member management is admin+. Operators see an honest, explained
  // disabled state rather than a control that silently 403s on submit.
  const canManageMembers = can("member:manage", { role: currentRole });
  // Owners may invite owners; everyone else can only invite at or below their rank.
  const canInviteOwner = hasRoleRank(currentRole, "owner");

  const form = useForm<InviteMemberData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      role: "member",
    },
  });

  if (!canManageMembers) {
    return (
      <FieldGroup className={className}>
        <Field>
          <FieldLabel>Invitar miembro</FieldLabel>
          <FieldDescription>
            Solo los administradores pueden invitar o gestionar miembros.
          </FieldDescription>
        </Field>
      </FieldGroup>
    );
  }

  async function onSubmit(values: InviteMemberData) {
    // Defense in depth: the server enforces this too; this keeps the UI honest.
    if (
      currentRole &&
      currentRole !== "owner" &&
      ROLE_RANK[currentRole as RoleName] < ROLE_RANK[values.role]
    ) {
      toast.error(
        `Como ${ROLE_LABELS[currentRole as RoleName]}, no puedes invitar a un ${ROLE_LABELS[values.role]}`
      );
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
                      <SelectItem value="owner">{ROLE_LABELS.owner}</SelectItem>
                    )}
                    <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
                    <SelectItem value="member">{ROLE_LABELS.member}</SelectItem>
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
