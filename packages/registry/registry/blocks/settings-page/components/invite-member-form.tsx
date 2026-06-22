"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { cn } from "@workspace/ui/lib/utils";
import { Controller, useForm } from "react-hook-form";
import { ROLE_LABELS } from "../lib/mock-organization";
import {
  type InviteMemberValues,
  inviteMemberSchema,
} from "../lib/settings-schemas";

export function InviteMemberForm({
  canManageMembers = true,
  className,
}: {
  canManageMembers?: boolean;
  className?: string;
}) {
  const form = useForm<InviteMemberValues>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      email: "",
      role: "member",
    },
  });

  if (!canManageMembers) {
    return (
      <FieldGroup className={className}>
        <Field>
          <FieldLabel>Invite member</FieldLabel>
          <FieldDescription>
            Only administrators can invite or manage members.
          </FieldDescription>
        </Field>
      </FieldGroup>
    );
  }

  async function onSubmit(values: InviteMemberValues) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    toast.success(`Invitation sent to ${values.email} (gallery mock)`);
    form.reset({ email: "", role: "member" });
  }

  return (
    <form className={cn(className)} onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <Controller
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <Field
                className="min-w-0 flex-1"
                data-invalid={fieldState.invalid}
              >
                <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                <Input
                  {...field}
                  aria-invalid={fieldState.invalid}
                  id={field.name}
                  placeholder="colleague@northside.com"
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
                className="w-full sm:w-40"
                data-invalid={fieldState.invalid}
              >
                <FieldLabel htmlFor={field.name}>Role</FieldLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger id={field.name}>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">{ROLE_LABELS.owner}</SelectItem>
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
            className="w-full sm:w-auto"
            disabled={form.formState.isSubmitting}
            type="submit"
          >
            {form.formState.isSubmitting ? "Inviting..." : "Send invitation"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
