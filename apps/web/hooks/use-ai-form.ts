"use client";

import { useForm } from "@tanstack/react-form";
import { useRegisterToolHandler } from "@/components/chat/tool-handler-registry";

/**
 * A wrapper around TanStack Form's useForm that automatically registers
 * AI tool handlers for form manipulation.
 *
 * This enables the AI assistant to:
 * - Read current form values
 * - Update form field values
 * - Validate the form
 * - Submit the form
 *
 * @example
 * ```tsx
 * const form = useAIForm({
 *   defaultValues: { name: "", email: "" },
 *   validators: { onSubmit: mySchema },
 *   onSubmit: ({ value }) => saveData(value),
 * });
 *
 * return <MyForm form={form} />;
 * ```
 */

// biome-ignore lint/suspicious/noExplicitAny: Ok
export function useAIForm<TFormData extends Record<string, any>>(
  options: Parameters<typeof useForm>[0] & { defaultValues: TFormData }
) {
  const form = useForm(options);

  // Register handler to read form values
  // @ts-expect-error - Ok
  useRegisterToolHandler("read-form-values", (input: unknown) => {
    const { fields } = (input ?? {}) as { fields?: string[] };
    const values = form.state.values as TFormData;
    if (fields && fields.length > 0) {
      const result: Record<string, unknown> = {};
      for (const field of fields) {
        result[field] = values[field as keyof TFormData];
      }
      return result;
    }
    return values;
  });

  // Register handler to update form values
  // @ts-expect-error - Ok
  useRegisterToolHandler("update-form-values", (input: unknown) => {
    const { updates } = input as { updates: Record<string, unknown> };
    for (const [field, value] of Object.entries(updates)) {
      // biome-ignore lint/suspicious/noExplicitAny: Ok
      form.setFieldValue(field as any, value as any);
    }
    return { updated: Object.keys(updates) };
  });

  // Register handler to validate form
  useRegisterToolHandler("validate-form", async () => {
    await form.validate("submit");
    return {
      isValid: form.state.isValid,
      errors: form.state.errorMap,
    };
  });

  // Register handler to submit form
  useRegisterToolHandler("submit-form", async () => {
    await form.handleSubmit();
    return { submitted: true };
  });

  return form;
}

/** Type helper for form instances that can be passed to AI-enabled components */
// @ts-expect-error - Ok
export type AIFormInstance = ReturnType<typeof useForm<unknown>>;
