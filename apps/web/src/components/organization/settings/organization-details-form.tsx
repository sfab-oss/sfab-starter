"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { can } from "@workspace/auth/access-control";
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
import { toast } from "@workspace/ui/components/shadcn/sonner";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { useUpdateOrganization } from "@/hooks/use-organization";
import { m } from "@/paraglide/messages.js";

const SLUG_PATTERN = /^[a-z0-9-]+$/;

function organizationDetailsSchema() {
  return z.object({
    name: z
      .string()
      .min(2, { message: m.org_name_min() })
      .max(100, { message: m.org_name_max() }),
    slug: z
      .string()
      .min(2, { message: m.org_slug_min() })
      .max(50, { message: m.org_slug_max() })
      .regex(SLUG_PATTERN, {
        message: m.org_slug_pattern(),
      }),
  });
}

type OrganizationDetailsData = z.infer<
  ReturnType<typeof organizationDetailsSchema>
>;

interface OrganizationDetailsFormProps {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  className?: string;
}

export function OrganizationDetailsForm({
  organization,
  className,
}: OrganizationDetailsFormProps) {
  const updateOrganization = useUpdateOrganization();
  const { data: activeMember } = authClient.useActiveMember();
  // Editing org settings is admin+; operators see the values read-only.
  const canEditSettings = can("org:settings", {
    role: activeMember?.role ?? null,
  });

  const form = useForm<OrganizationDetailsData>({
    resolver: zodResolver(organizationDetailsSchema()),
    defaultValues: {
      name: organization.name,
      slug: organization.slug,
    },
  });

  async function onSubmit(values: OrganizationDetailsData) {
    try {
      await updateOrganization.mutateAsync(values);
      toast.success(m.org_details_updated());
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : m.org_details_update_failed()
      );
    }
  }

  return (
    <form className={className} onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>{m.org_field_name()}</FieldLabel>
              <Input
                {...field}
                aria-invalid={fieldState.invalid}
                disabled={!canEditSettings}
                id={field.name}
                placeholder="Acme Inc."
                type="text"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="slug"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>{m.org_field_slug()}</FieldLabel>
              <Input
                {...field}
                aria-invalid={fieldState.invalid}
                disabled={!canEditSettings}
                id={field.name}
                placeholder="acme"
                type="text"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Field>
          <Button
            className="w-full"
            disabled={!canEditSettings || updateOrganization.isPending}
            type="submit"
          >
            {updateOrganization.isPending ? m.common_saving() : m.common_save()}
          </Button>
          {!canEditSettings && (
            <FieldDescription>{m.org_details_admin_only()}</FieldDescription>
          )}
        </Field>
      </FieldGroup>
    </form>
  );
}
