"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { authClient } from "@workspace/auth/client";
import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/shadcn/field";
import { Input } from "@workspace/ui/components/shadcn/input";
import { toast } from "@workspace/ui/components/shadcn/sonner";
import { slug as slugify } from "github-slugger";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { client } from "@/lib/client";

export const formSchema = z.object({
  name: z
    .string()
    .min(3, { message: "Name must be at least 3 characters" })
    .max(100, { message: "Name must be less than 100 characters" }),
  slug: z
    .string()
    .min(3, { message: "Tag must be at least 3 characters" })
    .max(50, { message: "Tag must be less than 50 characters" }),
});

export type CreateOrganizationData = z.infer<typeof formSchema>;

const DIACRITICS_REGEX = /\p{Diacritic}/gu;
const MULTIPLE_HYPHENS_REGEX = /-{2,}/g;
const TRAILING_HYPHEN_REGEX = /-+$/;

export const filterName = (name: string) =>
  name
    .replace(/[^a-zA-Z0-9\s-_']/g, "")
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "");

export const filterSlug = (slug: string) =>
  slug
    .replace(/[^a-z0-9-_]/g, "")
    .replace(MULTIPLE_HYPHENS_REGEX, "-")
    .replace(TRAILING_HYPHEN_REGEX, "");

export function CreateOrganizationForm({
  className,
  onSuccess,
}: {
  className?: string;
  onSuccess?: () => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm<CreateOrganizationData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
    },
  });

  async function onSubmit(values: CreateOrganizationData) {
    try {
      const response = await client.protected.organization["check-slug"].$post({
        json: { slug: values.slug },
      });
      const { available } = await response.json();

      if (!available) {
        toast.error("Slug already exists");
        return;
      }

      const { data, error } = await authClient.organization.create({
        name: values.name,
        slug: values.slug,
      });

      if (data) {
        await authClient.organization.setActive({
          organizationId: data.id,
        });
        queryClient.invalidateQueries({ queryKey: ["organizations"] });
        queryClient.invalidateQueries({ queryKey: ["activeOrganization"] });

        navigate({ to: "/" });
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast.error(error?.message ?? "Failed to create organization");
      }
    } catch {
      toast.error("Failed to create organization");
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
              <FieldLabel htmlFor={field.name}>Name</FieldLabel>
              <Input
                {...field}
                aria-invalid={fieldState.invalid}
                id={field.name}
                onChange={(e) => {
                  const filtered = filterName(e.target.value);
                  field.onChange(filtered);
                  form.setValue("slug", slugify(filtered));
                }}
                placeholder="SpaceX"
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
                id={field.name}
                onChange={(e) => {
                  const filtered = filterSlug(e.target.value);
                  field.onChange(filtered);
                }}
                placeholder="spacex"
                type="text"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Field>
          <Button
            className="w-full"
            disabled={form.formState.isSubmitting}
            type="submit"
          >
            {form.formState.isSubmitting
              ? "Creating..."
              : "Create Organization"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
