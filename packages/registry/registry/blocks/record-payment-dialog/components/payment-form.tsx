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
  formatMoneyMinor,
  type MoneyMinor,
  majorToMinor,
  minorToMajor,
} from "@workspace/ui/lib/money";
import { Controller, useForm } from "react-hook-form";
import {
  createPaymentFormSchema,
  type PaymentFormValues,
} from "../lib/payment-form-schema";
import type { PaymentInvoiceContext } from "../lib/payment-types";

function InvoiceMoneySummary({ invoice }: { invoice: PaymentInvoiceContext }) {
  return (
    <dl
      className="grid grid-cols-3 gap-3 rounded-lg border bg-muted/30 p-3 text-sm"
      data-slot="payment-invoice-summary"
    >
      <div>
        <dt className="text-muted-foreground">Total</dt>
        <dd className="font-medium tabular-nums">
          {formatMoneyMinor(invoice.totalMinor, invoice.currencyCode)}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Paid</dt>
        <dd className="tabular-nums">
          {formatMoneyMinor(invoice.paidMinor, invoice.currencyCode)}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Balance</dt>
        <dd className="font-medium tabular-nums">
          {formatMoneyMinor(invoice.balanceMinor, invoice.currencyCode)}
        </dd>
      </div>
    </dl>
  );
}

export function PaymentForm({
  invoice,
  defaultAmountMinor,
  defaultPaymentDate = "2026-06-21",
  formId = "payment-form",
  onSubmit,
}: {
  invoice: PaymentInvoiceContext;
  defaultAmountMinor: MoneyMinor;
  defaultPaymentDate?: string;
  formId?: string;
  onSubmit: (data: PaymentFormValues) => void | Promise<void>;
}) {
  const schema = createPaymentFormSchema(invoice.balanceMinor);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amountMinor: defaultAmountMinor,
      paymentDate: defaultPaymentDate,
      reference: "",
    },
  });

  return (
    <form
      className="space-y-4"
      id={formId}
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <InvoiceMoneySummary invoice={invoice} />

      <FieldGroup>
        <Controller
          control={form.control}
          name="amountMinor"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="payment-amount">
                Amount to collect
              </FieldLabel>
              <FieldDescription>
                Major units in the field — stored as integer{" "}
                {invoice.currencyCode} minor units on submit.
              </FieldDescription>
              <Input
                aria-invalid={fieldState.invalid}
                className="tabular-nums"
                id="payment-amount"
                inputMode="decimal"
                onChange={(event) => {
                  const major = Number.parseFloat(event.target.value);
                  if (Number.isFinite(major)) {
                    field.onChange(majorToMinor(major, invoice.currencyCode));
                  }
                }}
                type="number"
                value={minorToMajor(field.value, invoice.currencyCode)}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="paymentDate"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="payment-date">Payment date</FieldLabel>
              <Input
                aria-invalid={fieldState.invalid}
                id="payment-date"
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
          name="reference"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="payment-reference">Reference</FieldLabel>
              <Input
                {...field}
                aria-invalid={fieldState.invalid}
                id="payment-reference"
                placeholder="Transfer ref, check number, etc."
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
