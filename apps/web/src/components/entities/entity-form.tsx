"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  type EntityFormValues as ContractEntityFormValues,
  entityFormSchema,
  entityTypeSchema,
} from "@workspace/contract/transaction";
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
import {
  DEFAULT_CURRENCY,
  formatMajorInputValue,
  majorToMinor,
  minorToMajorInput,
} from "@workspace/ui/lib/money";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { m } from "@/paraglide/messages.js";

export type EntityFormValues = ContractEntityFormValues;

/** UI schema: credit limit in major units; converted to minor before onSubmit. */
function entityFormUiSchema() {
  return z.object({
    name: z.string().min(1, m.entities_name_required()),
    type: entityTypeSchema,
    creditLimit: z.number().nonnegative().nullable().optional(),
  });
}
type EntityFormUiValues = z.infer<ReturnType<typeof entityFormUiSchema>>;

interface EntityFormProps {
  mode?: "create" | "edit";
  defaultValues?: Partial<EntityFormValues>;
  onSubmit: (data: EntityFormValues) => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export function EntityForm({
  mode = "create",
  defaultValues,
  onSubmit,
  isLoading,
  submitLabel = m.common_save(),
}: EntityFormProps) {
  const form = useForm<EntityFormUiValues>({
    resolver: zodResolver(entityFormUiSchema()),
    defaultValues: {
      name: defaultValues?.name ?? "",
      type: defaultValues?.type ?? "customer",
      creditLimit:
        defaultValues?.creditLimit == null
          ? null
          : minorToMajorInput(defaultValues.creditLimit, DEFAULT_CURRENCY),
    },
  });

  const { isDirty } = form.formState;
  const submitDisabled = Boolean(isLoading) || (mode === "edit" && !isDirty);

  const handleSubmit = (data: EntityFormUiValues) => {
    const creditLimit =
      data.creditLimit == null
        ? null
        : majorToMinor(data.creditLimit, DEFAULT_CURRENCY);
    // Contract still requires integer minor units.
    entityFormSchema.parse({
      name: data.name,
      type: data.type,
      creditLimit,
    });
    onSubmit({
      name: data.name,
      type: data.type,
      creditLimit,
    });
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)}>
      <FieldGroup className="gap-4">
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel
                className="text-muted-foreground"
                htmlFor={field.name}
              >
                {m.common_name()}
              </FieldLabel>
              <Input
                {...field}
                aria-invalid={fieldState.invalid}
                id={field.name}
                placeholder={m.entities_name_placeholder()}
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
              <FieldLabel className="text-muted-foreground">
                {m.entities_type()}
              </FieldLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder={m.entities_type_placeholder()} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">
                    {m.entities_type_customer()}
                  </SelectItem>
                  <SelectItem value="supplier">
                    {m.entities_type_supplier()}
                  </SelectItem>
                  <SelectItem value="walk_in">
                    {m.documents_walk_in()}
                  </SelectItem>
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
              <FieldLabel
                className="text-muted-foreground"
                htmlFor={field.name}
              >
                {m.entities_credit_limit()}
              </FieldLabel>
              <Input
                aria-invalid={fieldState.invalid}
                id={field.name}
                min={0}
                onChange={(e) => {
                  const raw = e.target.value;
                  field.onChange(raw === "" ? null : Number(raw));
                }}
                placeholder={m.common_optional()}
                step="0.01"
                type="number"
                value={
                  field.value == null
                    ? ""
                    : formatMajorInputValue(field.value, DEFAULT_CURRENCY)
                }
              />
              <FieldDescription>
                {m.entities_credit_limit_hint({
                  currency: DEFAULT_CURRENCY,
                })}
              </FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
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
