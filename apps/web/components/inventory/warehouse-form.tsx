"use client";

import { type FieldApi, useForm } from "@tanstack/react-form";
import { warehouseFormSchema } from "@workspace/types/warehouses";
import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/shadcn/field";
import { Input } from "@workspace/ui/components/shadcn/input";
import { Switch } from "@workspace/ui/components/shadcn/switch";
import type { z } from "zod";
import type { AIFormInstance } from "@/hooks/use-ai-form";

export type WarehouseFormValues = z.infer<typeof warehouseFormSchema>;

// Field type aliases for explicit typing
type StringFieldApi = FieldApi<
  WarehouseFormValues,
  "name" | "location",
  undefined,
  undefined,
  string
>;
type BooleanFieldApi = FieldApi<
  WarehouseFormValues,
  "isDefault",
  undefined,
  undefined,
  boolean
>;

interface WarehouseFormProps {
  /** Submit handler - only used when form is managed internally */
  onSubmit?: (data: WarehouseFormValues) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  defaultValues?: Partial<WarehouseFormValues>;
  submitLabel?: string;
  /** External form instance for controlled mode (AI integration) */
  form?: AIFormInstance;
}

export function WarehouseForm({
  onSubmit,
  isLoading,
  defaultValues,
  submitLabel = "Save Warehouse",
  form: externalForm,
}: WarehouseFormProps) {
  const initialValues: WarehouseFormValues = {
    name: defaultValues?.name || "",
    location: defaultValues?.location || "",
    isDefault: defaultValues?.isDefault ?? false,
  };

  // Use external form if provided (controlled mode), otherwise create internal form (standalone mode)
  const internalForm = useForm({
    defaultValues: initialValues,
    validators: {
      onSubmit: warehouseFormSchema,
      onChange: warehouseFormSchema,
    },
    onSubmit: ({ value }) => {
      onSubmit?.(value);
    },
  });

  const form = externalForm ?? internalForm;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <FieldGroup>
        <form.Field name="name">
          {(field: StringFieldApi) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                <Input
                  aria-invalid={isInvalid}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Main Warehouse, Storage A, etc."
                  value={field.state.value}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>

        <form.Field name="location">
          {(field: StringFieldApi) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Location</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Address or description..."
                value={field.state.value || ""}
              />
            </Field>
          )}
        </form.Field>

        <form.Field name="isDefault">
          {(field: BooleanFieldApi) => (
            <Field
              className="items-center justify-between rounded-lg border p-3 shadow-sm"
              orientation="horizontal"
            >
              <div className="space-y-0.5">
                <FieldLabel className="text-base">Default Warehouse</FieldLabel>
                <p className="text-[0.8rem] text-muted-foreground">
                  Set this as the primary warehouse for AI and manual movements.
                </p>
              </div>
              <Switch
                checked={field.state.value}
                onCheckedChange={field.handleChange}
              />
            </Field>
          )}
        </form.Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button disabled={isLoading} type="submit">
            {isLoading ? "Saving..." : submitLabel}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
