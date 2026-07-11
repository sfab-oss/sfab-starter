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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/shadcn/select";
import {
  formatMajorInputValue,
  formatMoneyMinor,
  majorToMinor,
  minorToMajor,
  minorToMajorInput,
} from "@workspace/ui/lib/money";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

export const DOCUMENT_PAYMENT_FORM_ID = "document-payment-form";

function createDocumentPaymentSchema(balanceDue: number, currencyCode: string) {
  return z
    .object({
      method: z.string().min(1, "Select a payment method"),
      amountMajor: z.number(),
    })
    .superRefine((data, ctx) => {
      const amount = majorToMinor(data.amountMajor, currencyCode);
      if (!(amount > 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["amountMajor"],
          message: "Amount must be greater than zero",
        });
        return;
      }
      if (amount > balanceDue) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["amountMajor"],
          message: "Amount cannot exceed balance due",
        });
      }
    });
}

export type DocumentPaymentFormValues = z.infer<
  ReturnType<typeof createDocumentPaymentSchema>
>;

interface DocumentPaymentFormProps {
  balanceDue: number;
  currencyCode: string;
  total: number;
  amountPaid: number;
  defaultAmountMajor?: number;
  formId?: string;
  onSubmit: (data: DocumentPaymentFormValues) => void | Promise<void>;
}

export function DocumentPaymentForm({
  balanceDue,
  currencyCode,
  total,
  amountPaid,
  defaultAmountMajor,
  formId = DOCUMENT_PAYMENT_FORM_ID,
  onSubmit,
}: DocumentPaymentFormProps) {
  const schema = createDocumentPaymentSchema(balanceDue, currencyCode);
  const form = useForm<DocumentPaymentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      method: "cash",
      amountMajor:
        defaultAmountMajor ?? minorToMajorInput(balanceDue, currencyCode),
    },
  });

  return (
    <form
      className="space-y-4"
      id={formId}
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <dl className="grid grid-cols-3 gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Total</dt>
          <dd className="font-medium tabular-nums">
            {formatMoneyMinor(total, currencyCode)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Paid</dt>
          <dd className="tabular-nums">
            {formatMoneyMinor(amountPaid, currencyCode)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Balance</dt>
          <dd className="font-medium tabular-nums">
            {formatMoneyMinor(balanceDue, currencyCode)}
          </dd>
        </div>
      </dl>

      <FieldGroup className="gap-4">
        <Controller
          control={form.control}
          name="method"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel className="text-muted-foreground">Method</FieldLabel>
              <Select
                onValueChange={(value) => {
                  if (value != null) {
                    field.onChange(value);
                  }
                }}
                value={field.value}
              >
                <SelectTrigger aria-invalid={fieldState.invalid}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="amountMajor"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel
                className="text-muted-foreground"
                htmlFor={field.name}
              >
                Amount
              </FieldLabel>
              <FieldDescription>
                Cannot exceed balance due (
                {formatMoneyMinor(balanceDue, currencyCode)}).
              </FieldDescription>
              <Input
                aria-invalid={fieldState.invalid}
                className="tabular-nums"
                id={field.name}
                max={minorToMajor(balanceDue, currencyCode)}
                min={0}
                onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                step="0.01"
                type="number"
                value={formatMajorInputValue(field.value, currencyCode)}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>
    </form>
  );
}
