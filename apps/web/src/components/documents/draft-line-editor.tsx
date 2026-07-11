"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  formatMajorInputValue,
  majorToMinor,
  minorToMajorInput,
} from "@workspace/ui/lib/money";
import { Plus } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { percentToBps } from "@/components/documents/document-type";
import { useAddLineItem, useDocument } from "@/hooks/use-documents";
import { useProducts } from "@/hooks/use-products";
import {
  type AddLineFormValues,
  addLineFormSchema,
} from "./document-line-form";
import { LineItemRow } from "./line-item-row";

const LINE_GRID =
  "grid grid-cols-1 gap-2 sm:grid-cols-[1fr_5rem_7rem_5rem_auto] sm:items-center";
const ADD_GRID =
  "grid grid-cols-1 gap-2 sm:grid-cols-[8rem_1fr_5rem_7rem_5rem_auto] sm:items-end";

interface DraftLineEditorProps {
  docId: string;
  currencyCode: string;
}

export function DraftLineEditor({ docId, currencyCode }: DraftLineEditorProps) {
  const addLineItem = useAddLineItem();
  const { data: productsResp } = useProducts({
    page: 1,
    pageSize: 50,
    sortOrder: "asc",
  });
  const { data } = useDocument(docId);
  const lines = data?.lines ?? [];

  const form = useForm<AddLineFormValues>({
    resolver: zodResolver(addLineFormSchema),
    defaultValues: {
      productId: "",
      description: "",
      quantity: 1,
      unitPriceMajor: 0,
      taxPercent: 0,
    },
  });

  const pickProduct = (productId: string) => {
    const product = productsResp?.data.find((p) => p.id === productId);
    if (!product) {
      form.setValue("productId", "");
      return;
    }
    form.setValue("productId", productId);
    form.setValue("description", product.name, { shouldValidate: true });
    form.setValue(
      "unitPriceMajor",
      minorToMajorInput(product.price ?? 0, currencyCode),
      { shouldValidate: true }
    );
  };

  const onSubmit = async (values: AddLineFormValues) => {
    await addLineItem.mutateAsync({
      id: docId,
      data: {
        productId: values.productId || undefined,
        description: values.description,
        quantity: values.quantity,
        unitPrice: majorToMinor(values.unitPriceMajor, currencyCode),
        taxRate: percentToBps(values.taxPercent),
      },
    });
    form.reset({
      productId: "",
      description: "",
      quantity: 1,
      unitPriceMajor: 0,
      taxPercent: 0,
    });
  };

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm">Line items</h3>
      <div className="divide-y rounded-lg border">
        <div
          className={`hidden px-3 py-2 text-muted-foreground text-xs sm:grid ${LINE_GRID}`}
        >
          <span>Description</span>
          <span>Qty</span>
          <span>Unit price</span>
          <span>Tax %</span>
          <span className="sr-only">Actions</span>
        </div>
        {lines.map((line) => (
          <LineItemRow
            currencyCode={currencyCode}
            docId={docId}
            key={line.id}
            line={line}
          />
        ))}
        {lines.length === 0 && (
          <div className="px-4 py-6 text-center text-muted-foreground text-xs">
            No lines yet.
          </div>
        )}
      </div>

      <form
        className={`rounded-lg border p-3 ${ADD_GRID}`}
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <Controller
          control={form.control}
          name="productId"
          render={({ field }) => (
            <Field className="gap-1">
              <FieldLabel className="text-muted-foreground text-xs sm:sr-only">
                Product
              </FieldLabel>
              <Select
                onValueChange={(value) => {
                  if (value != null) {
                    pickProduct(value);
                  }
                }}
                value={field.value || undefined}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Product" />
                </SelectTrigger>
                <SelectContent>
                  {(productsResp?.data ?? []).map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        />

        <FieldGroup className="contents">
          <Controller
            control={form.control}
            name="description"
            render={({ field, fieldState }) => (
              <Field className="gap-1" data-invalid={fieldState.invalid}>
                <FieldLabel className="text-muted-foreground text-xs sm:sr-only">
                  Description
                </FieldLabel>
                <Input
                  {...field}
                  aria-invalid={fieldState.invalid}
                  aria-label="Description"
                  placeholder="Description"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="quantity"
            render={({ field, fieldState }) => (
              <Field className="gap-1" data-invalid={fieldState.invalid}>
                <FieldLabel className="text-muted-foreground text-xs sm:sr-only">
                  Qty
                </FieldLabel>
                <Input
                  aria-invalid={fieldState.invalid}
                  aria-label="Quantity"
                  min={1}
                  onChange={(e) => field.onChange(Number(e.target.value) || 1)}
                  type="number"
                  value={field.value}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="unitPriceMajor"
            render={({ field, fieldState }) => (
              <Field className="gap-1" data-invalid={fieldState.invalid}>
                <FieldLabel className="text-muted-foreground text-xs sm:sr-only">
                  Unit price
                </FieldLabel>
                <Input
                  aria-invalid={fieldState.invalid}
                  aria-label="Unit price"
                  min={0}
                  onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                  placeholder="Price"
                  step="0.01"
                  type="number"
                  value={formatMajorInputValue(field.value, currencyCode)}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="taxPercent"
            render={({ field, fieldState }) => (
              <Field className="gap-1" data-invalid={fieldState.invalid}>
                <FieldLabel className="text-muted-foreground text-xs sm:sr-only">
                  Tax %
                </FieldLabel>
                <Input
                  aria-invalid={fieldState.invalid}
                  aria-label="Tax percent"
                  min={0}
                  onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                  placeholder="Tax %"
                  step="0.01"
                  type="number"
                  value={field.value}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </FieldGroup>

        <Button disabled={addLineItem.isPending} type="submit">
          <Plus className="size-4" />
          Add
        </Button>
      </form>
    </div>
  );
}
