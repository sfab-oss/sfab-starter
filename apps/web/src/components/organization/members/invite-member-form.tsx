"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  can,
  hasRoleRank,
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
import { roleMessage } from "@/lib/role-label";
import { m } from "@/paraglide/messages.js";

interface InviteMemberData {
  email: string;
  role: "member" | "admin" | "owner";
}

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

  const formSchema = z.object({
    email: z.string().email({ message: m.invite_email_invalid() }),
    role: z.enum(["member", "admin", "owner"]),
  });

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
          <FieldLabel>{m.invite_title()}</FieldLabel>
          <FieldDescription>{m.invite_admin_only()}</FieldDescription>
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
        m.invite_rbac_denied({
          role: roleMessage(currentRole as RoleName),
          targetRole: roleMessage(values.role),
        })
      );
      return;
    }

    try {
      await inviteMember.mutateAsync(values);
      toast.success(m.invite_success());
      form.reset();
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : m.invite_failed());
    }
  }

  return (
    <form className={className} onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <div className="flex flex-col gap-4 sm:flex-row sm:gap-2">
          <Controller
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <Field
                className="min-w-0 flex-1"
                data-invalid={fieldState.invalid}
              >
                <FieldLabel htmlFor={field.name}>{m.auth_email()}</FieldLabel>
                <Input
                  {...field}
                  aria-invalid={fieldState.invalid}
                  id={field.name}
                  placeholder={m.invite_email_placeholder()}
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
              <Field
                className="w-full sm:w-40 sm:shrink-0"
                data-invalid={fieldState.invalid}
              >
                <FieldLabel htmlFor={field.name}>{m.invite_role()}</FieldLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="w-full" id={field.name}>
                    <SelectValue placeholder={m.invite_role_placeholder()}>
                      {roleMessage(field.value as RoleName)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {canInviteOwner && (
                      <SelectItem value="owner">{m.role_owner()}</SelectItem>
                    )}
                    <SelectItem value="admin">{m.role_admin()}</SelectItem>
                    <SelectItem value="member">{m.role_member()}</SelectItem>
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
            {inviteMember.isPending ? m.invite_sending() : m.invite_send()}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
