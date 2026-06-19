"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { movementFormSchema } from "@workspace/contract/products";
import type { Warehouse } from "@workspace/contract/warehouses";
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
import { Textarea } from "@workspace/ui/components/shadcn/textarea";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";
import { useAllWarehouses } from "@/hooks/use-warehouses";

export type MovementFormValues = z.infer<typeof movementFormSchema>;

interface MovementFormProps {
  onSubmit: (data: MovementFormValues) => void;
  onCancel: () => void;
  isLoading?: boolean;
  initialType?: "IN" | "OUT" | "TRANSFER" | "ADJUSTMENT";
}

export function MovementForm({
  onSubmit,
  onCancel,
  isLoading,
  initialType = "IN",
}: MovementFormProps) {
  const { data: warehouses } = useAllWarehouses();

  const form = useForm<MovementFormValues>({
    resolver: zodResolver(movementFormSchema),
    defaultValues: {
      type: initialType,
      quantity: 1,
      fromWarehouseId: null,
      toWarehouseId: null,
      notes: null,
    },
  });

  const movementType = form.watch("type");
  const showFromWarehouse =
    movementType === "OUT" ||
    movementType === "TRANSFER" ||
    movementType === "ADJUSTMENT";
  const showToWarehouse =
    movementType === "IN" ||
    movementType === "TRANSFER" ||
    movementType === "ADJUSTMENT";

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <Controller
          control={form.control}
          name="type"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Movement Type</FieldLabel>
              <Select
                name={field.name}
                onValueChange={field.onChange}
                value={field.value}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">Restock (IN)</SelectItem>
                  <SelectItem value="OUT">Remove Stock (OUT)</SelectItem>
                  <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                  <SelectItem value="TRANSFER">Transfer</SelectItem>
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {showFromWarehouse && (
          <Controller
            control={form.control}
            name="fromWarehouseId"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>
                  {movementType === "TRANSFER"
                    ? "Source Warehouse"
                    : "Warehouse"}
                </FieldLabel>
                <Select
                  name={field.name}
                  onValueChange={(val) => field.onChange(val || null)}
                  value={field.value ?? ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses?.map((w: Warehouse) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name} {w.isDefault ? "(Default)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        )}

        {showToWarehouse && (
          <Controller
            control={form.control}
            name="toWarehouseId"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>
                  {movementType === "TRANSFER"
                    ? "Destination Warehouse"
                    : "Warehouse"}
                </FieldLabel>
                <Select
                  name={field.name}
                  onValueChange={(val) => field.onChange(val || null)}
                  value={field.value ?? ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses?.map((w: Warehouse) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name} {w.isDefault ? "(Default)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        )}

        <Controller
          control={form.control}
          name="quantity"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Quantity</FieldLabel>
              <Input
                {...field}
                aria-invalid={fieldState.invalid}
                id={field.name}
                min="1"
                onChange={(e) =>
                  field.onChange(Number.parseInt(e.target.value, 10))
                }
                placeholder="Enter quantity"
                type="number"
                value={field.value}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="notes"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Notes</FieldLabel>
              <Textarea
                {...field}
                className="resize-none"
                id={field.name}
                placeholder="Optional notes..."
                value={field.value ?? ""}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button
            disabled={isLoading}
            onClick={onCancel}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={isLoading} type="submit">
            {isLoading ? "Processing..." : "Confirm Movement"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
