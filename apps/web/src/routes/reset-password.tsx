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

const resetPasswordSchema = z
  .object({
    password: z
      .string({ message: "Password is required" })
      .min(
        MIN_PASSWORD_LENGTH,
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
      )
      .max(100, "Password must be at most 100 characters.")
      .regex(LOWERCASE_RE, "Password must include a lowercase letter.")
      .regex(UPPERCASE_RE, "Password must include an uppercase letter.")
      .regex(NUMBER_RE, "Password must include a number."),
    confirmPassword: z.string({ message: "Please confirm your password" }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

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
      label: `At least ${MIN_PASSWORD_LENGTH} characters`,
      met: password.length >= MIN_PASSWORD_LENGTH,
    },
    {
      id: "lower",
      label: "One lowercase letter",
      met: LOWERCASE_RE.test(password),
    },
    {
      id: "upper",
      label: "One uppercase letter",
      met: UPPERCASE_RE.test(password),
    },
    {
      id: "number",
      label: "One number",
      met: NUMBER_RE.test(password),
    },
    {
      id: "match",
      label: "Passwords match",
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
      <p className="font-medium text-sm">Password must include</p>
      <p className="mt-1 text-muted-foreground text-xs">
        Requirements update as you type.
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
              {requirement.met ? "met" : "not met"}
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
      toast.error("This reset link is invalid or has expired.");
      return;
    }

    const { error: resetError } = await authClient.resetPassword({
      newPassword: values.password,
      token,
    });

    if (resetError) {
      toast.error(resetError.message ?? "An error occurred");
      return;
    }

    toast.success("Password updated. You can log in with your new password.");
    await navigate({ to: "/login" });
  };

  const invalidLink = error === "INVALID_TOKEN" || !token;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Choose a new password</CardTitle>
          <CardDescription>
            {invalidLink
              ? "This reset link is invalid or has expired."
              : "Pick a strong password for your account. You will use it the next time you sign in."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invalidLink ? (
            <div className="mx-auto max-w-sm space-y-4">
              <p className="text-muted-foreground text-sm">
                Request a new reset link to try again.
              </p>
              <Link
                className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm shadow-xs hover:bg-primary/90"
                to="/forgot-password"
              >
                Request new link
              </Link>
              <Link
                className="inline-flex h-9 w-full items-center justify-center rounded-md border border-input bg-background px-4 py-2 font-medium text-sm shadow-xs hover:bg-accent hover:text-accent-foreground"
                to="/login"
              >
                Back to login
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
                          New password
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
                          Confirm password
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
                        ? "Updating password..."
                        : "Update password"}
                    </Button>
                    <p className="text-center text-muted-foreground text-sm">
                      <Link
                        className="underline-offset-4 hover:underline"
                        to="/login"
                      >
                        Back to login
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
