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
import { toast } from "@workspace/ui/components/shadcn/sonner";
import { cn } from "@workspace/ui/lib/utils";
import { Controller, useForm } from "react-hook-form";
import {
  type OrganizationDetailsValues,
  organizationDetailsSchema,
} from "../lib/settings-schemas";

export function OrganizationDetailsForm({
  defaultValues,
  canEditSettings = true,
  className,
}: {
  defaultValues: OrganizationDetailsValues;
  canEditSettings?: boolean;
  className?: string;
}) {
  const form = useForm<OrganizationDetailsValues>({
    resolver: zodResolver(organizationDetailsSchema),
    defaultValues,
  });

  async function onSubmit(values: OrganizationDetailsValues) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    form.reset(values);
    toast.success("Organization details updated (gallery mock)");
  }

  return (
    <form className={cn(className)} onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Name</FieldLabel>
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
              <FieldLabel htmlFor={field.name}>Slug</FieldLabel>
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
            disabled={!canEditSettings || form.formState.isSubmitting}
            type="submit"
          >
            {form.formState.isSubmitting ? "Saving..." : "Save changes"}
          </Button>
          {canEditSettings ? null : (
            <FieldDescription>
              Only administrators can edit organization details.
            </FieldDescription>
          )}
        </Field>
      </FieldGroup>
    </form>
  );
}
