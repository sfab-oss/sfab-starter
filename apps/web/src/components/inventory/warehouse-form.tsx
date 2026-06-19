"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { warehouseFormSchema } from "@workspace/contract/warehouses";
import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/shadcn/field";
import { Input } from "@workspace/ui/components/shadcn/input";
import { Switch } from "@workspace/ui/components/shadcn/switch";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";

export type WarehouseFormValues = z.infer<typeof warehouseFormSchema>;

interface WarehouseFormProps {
  onSubmit: (data: WarehouseFormValues) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  defaultValues?: Partial<WarehouseFormValues>;
  submitLabel?: string;
}

export function WarehouseForm({
  onSubmit,
  isLoading,
  defaultValues,
  submitLabel = "Save Warehouse",
}: WarehouseFormProps) {
  const form = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseFormSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      location: defaultValues?.location || "",
      isDefault: defaultValues?.isDefault ?? false,
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
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
                placeholder="Main Warehouse, Storage A, etc."
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="location"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Location</FieldLabel>
              <Input
                {...field}
                id={field.name}
                placeholder="Address or description..."
                value={field.value ?? ""}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="isDefault"
          render={({ field, fieldState }) => (
            <Field
              className="items-center justify-between rounded-lg border p-3 shadow-sm"
              data-invalid={fieldState.invalid}
              orientation="horizontal"
            >
              <div className="space-y-0.5">
                <FieldLabel className="text-base">Default Warehouse</FieldLabel>
                <p className="text-[0.8rem] text-muted-foreground">
                  Set this as the primary warehouse for AI and manual movements.
                </p>
              </div>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </Field>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button disabled={isLoading} type="submit">
            {isLoading ? "Saving..." : submitLabel}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
