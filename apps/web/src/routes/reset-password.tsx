import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { authClient } from "@workspace/auth/client";
import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/shadcn/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/shadcn/field";
import { Input } from "@workspace/ui/components/shadcn/input";
import { toast } from "@workspace/ui/components/shadcn/sonner";
import { cn } from "@workspace/ui/lib/utils";
import { Check, Circle } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { m } from "@/paraglide/messages.js";

const resetPasswordSearchSchema = z.object({
  token: z.string().optional(),
  error: z.string().optional(),
});

export const Route = createFileRoute("/reset-password")({
  validateSearch: resetPasswordSearchSchema,
  component: ResetPasswordPage,
});

const MIN_PASSWORD_LENGTH = 8;
const LOWERCASE_RE = /[a-z]/;
const UPPERCASE_RE = /[A-Z]/;
const NUMBER_RE = /[0-9]/;

interface ResetPasswordValues {
  password: string;
  confirmPassword: string;
}

interface PasswordRequirement {
  id: string;
  label: string;
  met: boolean;
}

function getPasswordRequirements(
  password: string,
  confirmPassword: string
): PasswordRequirement[] {
  return [
    {
      id: "length",
      label: m.auth_password_req_length({
        count: String(MIN_PASSWORD_LENGTH),
      }),
      met: password.length >= MIN_PASSWORD_LENGTH,
    },
    {
      id: "lower",
      label: m.auth_password_req_lower(),
      met: LOWERCASE_RE.test(password),
    },
    {
      id: "upper",
      label: m.auth_password_req_upper(),
      met: UPPERCASE_RE.test(password),
    },
    {
      id: "number",
      label: m.auth_password_req_number(),
      met: NUMBER_RE.test(password),
    },
    {
      id: "match",
      label: m.auth_password_req_match(),
      met:
        password.length > 0 &&
        confirmPassword.length > 0 &&
        password === confirmPassword,
    },
  ];
}

function PasswordRequirementsPanel({
  requirements,
}: {
  requirements: PasswordRequirement[];
}) {
  return (
    <div>
      <p className="font-medium text-sm">{m.auth_password_must_include()}</p>
      <p className="mt-1 text-muted-foreground text-xs">
        {m.auth_password_requirements_hint()}
      </p>
      <ul className="mt-4 space-y-2.5">
        {requirements.map((requirement) => (
          <li
            className={cn(
              "flex items-center gap-2 text-sm transition-colors",
              requirement.met
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground"
            )}
            key={requirement.id}
          >
            {requirement.met ? (
              <Check
                aria-hidden
                className="size-4 shrink-0"
                strokeWidth={2.5}
              />
            ) : (
              <Circle aria-hidden className="size-4 shrink-0" strokeWidth={2} />
            )}
            <span>{requirement.label}</span>
            <span className="sr-only">
              {requirement.met
                ? m.auth_password_req_met()
                : m.auth_password_req_not_met()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { token, error } = Route.useSearch();

  const resetPasswordSchema = z
    .object({
      password: z
        .string({ message: m.auth_password_required() })
        .min(
          MIN_PASSWORD_LENGTH,
          m.auth_password_min({ count: String(MIN_PASSWORD_LENGTH) })
        )
        .max(100, m.auth_password_max())
        .regex(LOWERCASE_RE, m.auth_password_lowercase())
        .regex(UPPERCASE_RE, m.auth_password_uppercase())
        .regex(NUMBER_RE, m.auth_password_number()),
      confirmPassword: z.string({
        message: m.auth_password_confirm_required(),
      }),
    })
    .refine((values) => values.password === values.confirmPassword, {
      message: m.auth_password_mismatch(),
      path: ["confirmPassword"],
    });

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
    mode: "onChange",
  });

  const password = useWatch({ control: form.control, name: "password" }) ?? "";
  const confirmPassword =
    useWatch({ control: form.control, name: "confirmPassword" }) ?? "";
  const requirements = getPasswordRequirements(password, confirmPassword);
  const allRequirementsMet = requirements.every(
    (requirement) => requirement.met
  );

  const onSubmit = async (values: ResetPasswordValues) => {
    if (!token) {
      toast.error(m.auth_reset_invalid());
      return;
    }

    const { error: resetError } = await authClient.resetPassword({
      newPassword: values.password,
      token,
    });

    if (resetError) {
      toast.error(resetError.message ?? m.auth_error_generic());
      return;
    }

    toast.success(m.auth_reset_success());
    await navigate({ to: "/login" });
  };

  const invalidLink = error === "INVALID_TOKEN" || !token;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>{m.auth_reset_title()}</CardTitle>
          <CardDescription>
            {invalidLink ? m.auth_reset_invalid() : m.auth_reset_description()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invalidLink ? (
            <div className="mx-auto max-w-sm space-y-4">
              <p className="text-muted-foreground text-sm">
                {m.auth_reset_request_hint()}
              </p>
              <Link
                className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm shadow-xs hover:bg-primary/90"
                to="/forgot-password"
              >
                {m.auth_reset_request_link()}
              </Link>
              <Link
                className="inline-flex h-9 w-full items-center justify-center rounded-md border border-input bg-background px-4 py-2 font-medium text-sm shadow-xs hover:bg-accent hover:text-accent-foreground"
                to="/login"
              >
                {m.auth_forgot_back_to_login()}
              </Link>
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid gap-6 md:grid-cols-2 md:gap-0">
                <FieldGroup className="md:pr-8">
                  <Controller
                    control={form.control}
                    name="password"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={field.name}>
                          {m.auth_reset_new_password()}
                        </FieldLabel>
                        <Input
                          {...field}
                          aria-describedby="password-requirements"
                          aria-invalid={fieldState.invalid}
                          autoComplete="new-password"
                          id={field.name}
                          type="password"
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="confirmPassword"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={field.name}>
                          {m.auth_reset_confirm_password()}
                        </FieldLabel>
                        <Input
                          {...field}
                          aria-invalid={fieldState.invalid}
                          autoComplete="new-password"
                          id={field.name}
                          type="password"
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />
                  <Field>
                    <Button
                      className="w-full"
                      disabled={
                        form.formState.isSubmitting || !allRequirementsMet
                      }
                      type="submit"
                    >
                      {form.formState.isSubmitting
                        ? m.auth_reset_updating()
                        : m.auth_reset_update()}
                    </Button>
                    <p className="text-center text-muted-foreground text-sm">
                      <Link
                        className="underline-offset-4 hover:underline"
                        to="/login"
                      >
                        {m.auth_forgot_back_to_login()}
                      </Link>
                    </p>
                  </Field>
                </FieldGroup>

                <aside
                  aria-live="polite"
                  className="border-border border-t pt-6 md:border-t-0 md:border-l md:pt-0 md:pl-8"
                  id="password-requirements"
                >
                  <PasswordRequirementsPanel requirements={requirements} />
                </aside>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
