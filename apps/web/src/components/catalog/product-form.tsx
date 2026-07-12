"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { productFormSchema } from "@workspace/contract/catalog";
import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/shadcn/field";
import { Input } from "@workspace/ui/components/shadcn/input";
import { Textarea } from "@workspace/ui/components/shadcn/textarea";
import {
  DEFAULT_CURRENCY,
  formatMajorInputValue,
} from "@workspace/ui/lib/money";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";
import { m } from "@/paraglide/messages.js";
import { ImageUpload } from "./image-upload";

export type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  mode?: "create" | "edit";
  defaultValues?: Partial<ProductFormValues>;
  onSubmit: (data: ProductFormValues) => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export function ProductForm({
  mode = "create",
  defaultValues,
  onSubmit,
  isLoading,
  submitLabel = m.common_save(),
}: ProductFormProps) {
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      sku: defaultValues?.sku ?? "",
      price: defaultValues?.price ?? 0,
      minStockLevel: defaultValues?.minStockLevel ?? 5,
      description: defaultValues?.description ?? null,
      imageUrl: defaultValues?.imageUrl ?? null,
    },
  });

  const { isDirty } = form.formState;
  const submitDisabled = Boolean(isLoading) || (mode === "edit" && !isDirty);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup className="gap-4">
        <Controller
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <Field>
              <FieldLabel className="text-muted-foreground">
                Product Image
              </FieldLabel>
              <ImageUpload onChange={field.onChange} value={field.value} />
            </Field>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel
                  className="text-muted-foreground"
                  htmlFor={field.name}
                >
                  Name
                </FieldLabel>
                <FieldContent>
                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    id={field.name}
                    placeholder="Product Name"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </FieldContent>
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="sku"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel
                  className="text-muted-foreground"
                  htmlFor={field.name}
                >
                  SKU
                </FieldLabel>
                <FieldContent>
                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    id={field.name}
                    placeholder="PROD-001"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </FieldContent>
              </Field>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            control={form.control}
            name="price"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel
                  className="text-muted-foreground"
                  htmlFor={field.name}
                >
                  Price
                </FieldLabel>
                <FieldContent>
                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    id={field.name}
                    onChange={(e) =>
                      field.onChange(Number.parseFloat(e.target.value))
                    }
                    step="0.01"
                    type="number"
                    value={formatMajorInputValue(field.value, DEFAULT_CURRENCY)}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </FieldContent>
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="minStockLevel"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel
                  className="text-muted-foreground"
                  htmlFor={field.name}
                >
                  Low Stock Alert
                </FieldLabel>
                <FieldContent>
                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    id={field.name}
                    onChange={(e) =>
                      field.onChange(Number.parseInt(e.target.value, 10))
                    }
                    type="number"
                    value={field.value}
                  />
                  <FieldDescription>
                    Alert when stock falls below this.
                  </FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </FieldContent>
              </Field>
            )}
          />
        </div>

        <Controller
          control={form.control}
          name="description"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel
                className="text-muted-foreground"
                htmlFor={field.name}
              >
                Description
              </FieldLabel>
              <FieldContent>
                <Textarea
                  {...field}
                  aria-invalid={fieldState.invalid}
                  className="resize-none"
                  id={field.name}
                  placeholder="Product details..."
                  value={field.value ?? ""}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </FieldContent>
            </Field>
          )}
        />

        <div className="flex justify-end pt-1">
          <Button disabled={submitDisabled} type="submit">
            {isLoading ? m.common_saving() : submitLabel}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
