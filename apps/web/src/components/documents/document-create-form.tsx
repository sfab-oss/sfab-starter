"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { entityTypeSchema } from "@workspace/contract/transaction";
import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/shadcn/field";
import { Input } from "@workspace/ui/components/shadcn/input";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import {
  EntityPicker,
  type EntityPickerValue,
} from "@/components/entities/entity-picker";
import { m } from "@/paraglide/messages.js";

const ISO_CURRENCY_CODE = /^[A-Za-z]{3}$/;

function documentCreateFormSchema() {
  const entityPickerValueSchema = z.union([
    z.object({
      kind: z.literal("entity"),
      entity: z.object({
        id: z.string().min(1),
        name: z.string(),
        type: entityTypeSchema,
      }),
    }),
    z.object({
      kind: z.literal("walk_in"),
      name: z.string().min(1, m.documents_walk_in_name_required()),
    }),
  ]);

  return z.object({
    entity: entityPickerValueSchema,
    currencyCode: z
      .string()
      .trim()
      .refine((value) => value === "" || ISO_CURRENCY_CODE.test(value), {
        message: m.documents_currency_invalid(),
      }),
    series: z.string().trim().optional(),
  });
}

export type DocumentCreateFormValues = z.infer<
  ReturnType<typeof documentCreateFormSchema>
>;

interface DocumentCreateFormProps {
  defaultEntity?: NonNullable<EntityPickerValue>;
  onSubmit: (data: DocumentCreateFormValues) => void | Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

export function DocumentCreateForm({
  defaultEntity = { kind: "walk_in", name: m.documents_walk_in() },
  onSubmit,
  isLoading,
  submitLabel = m.common_create(),
}: DocumentCreateFormProps) {
  const form = useForm<DocumentCreateFormValues>({
    resolver: zodResolver(documentCreateFormSchema()),
    defaultValues: {
      entity: defaultEntity,
      currencyCode: "",
      series: "",
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup className="gap-4">
        <Controller
          control={form.control}
          name="entity"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel className="text-muted-foreground">
                {m.documents_customer_entity()}
              </FieldLabel>
              <EntityPicker onChange={field.onChange} value={field.value} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            control={form.control}
            name="currencyCode"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel
                  className="text-muted-foreground"
                  htmlFor={field.name}
                >
                  {m.documents_currency()}
                </FieldLabel>
                <Input
                  {...field}
                  aria-invalid={fieldState.invalid}
                  id={field.name}
                  placeholder={m.documents_currency_placeholder()}
                  value={field.value ?? ""}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="series"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel
                  className="text-muted-foreground"
                  htmlFor={field.name}
                >
                  {m.documents_series()}
                </FieldLabel>
                <Input
                  {...field}
                  aria-invalid={fieldState.invalid}
                  id={field.name}
                  placeholder={m.documents_series_placeholder()}
                  value={field.value ?? ""}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </div>

        <div className="flex justify-end pt-1">
          <Button disabled={isLoading} type="submit">
            {isLoading ? m.common_creating() : submitLabel}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
