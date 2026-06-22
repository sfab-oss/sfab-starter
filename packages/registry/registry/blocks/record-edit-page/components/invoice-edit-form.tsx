"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/shadcn/field";
import { Input } from "@workspace/ui/components/shadcn/input";
import { Textarea } from "@workspace/ui/components/shadcn/textarea";
import { Controller, useForm } from "react-hook-form";
import {
  type InvoiceEditValues,
  invoiceEditSchema,
} from "../lib/invoice-edit-schema";
import type { OpenInvoiceRow } from "../lib/payment-types";

export function InvoiceEditForm({
  invoice,
  onSubmit,
  formId = "invoice-edit-form",
}: {
  invoice: OpenInvoiceRow;
  onSubmit: (data: InvoiceEditValues) => void | Promise<void>;
  formId?: string;
}) {
  const form = useForm<InvoiceEditValues>({
    resolver: zodResolver(invoiceEditSchema),
    defaultValues: {
      dueDate: invoice.dueDate,
      notes: invoice.notes ?? "",
    },
  });

  return (
    <form
      className="w-full space-y-4"
      data-slot="invoice-edit-form"
      id={formId}
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <FieldGroup>
        <Controller
          control={form.control}
          name="dueDate"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="invoice-due-date">Due date</FieldLabel>
              <Input
                aria-invalid={fieldState.invalid}
                id="invoice-due-date"
                onChange={field.onChange}
                type="date"
                value={field.value}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="notes"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="invoice-notes">Internal notes</FieldLabel>
              <FieldDescription>
                Operator context — not printed on the invoice.
              </FieldDescription>
              <Textarea
                {...field}
                aria-invalid={fieldState.invalid}
                id="invoice-notes"
                placeholder="Terms, follow-up reminders, etc."
                rows={3}
                value={field.value ?? ""}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />
      </FieldGroup>
    </form>
  );
}
