"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  type EntityFormValues as ContractEntityFormValues,
  entityFormSchema,
} from "@workspace/contract/transaction";
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
import { Controller, useForm } from "react-hook-form";

export type EntityFormValues = ContractEntityFormValues;

interface EntityFormProps {
  defaultValues?: Partial<EntityFormValues>;
  onSubmit: (data: EntityFormValues) => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export function EntityForm({
  defaultValues,
  onSubmit,
  isLoading,
  submitLabel = "Save",
}: EntityFormProps) {
  const form = useForm<EntityFormValues>({
    resolver: zodResolver(entityFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      type: defaultValues?.type ?? "customer",
      creditLimit: defaultValues?.creditLimit ?? null,
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
                placeholder="Customer or supplier name"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="type"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Type</FieldLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="supplier">Supplier</SelectItem>
                  <SelectItem value="walk_in">Walk-in</SelectItem>
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="creditLimit"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                Credit limit (minor units)
              </FieldLabel>
              <Input
                aria-invalid={fieldState.invalid}
                id={field.name}
                min={0}
                onChange={(e) => {
                  const raw = e.target.value;
                  field.onChange(raw === "" ? null : Number(raw));
                }}
                placeholder="Optional"
                type="number"
                value={field.value ?? ""}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Button disabled={isLoading} type="submit">
          {isLoading ? "Saving…" : submitLabel}
        </Button>
      </FieldGroup>
    </form>
  );
}
