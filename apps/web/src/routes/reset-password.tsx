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
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

const resetPasswordSearchSchema = z.object({
  token: z.string().optional(),
  error: z.string().optional(),
});

export const Route = createFileRoute("/reset-password")({
  validateSearch: resetPasswordSearchSchema,
  component: ResetPasswordPage,
});

const resetPasswordSchema = z
  .object({
    password: z
      .string({ message: "Password is required" })
      .min(6, "Password must be at least 6 characters.")
      .max(100, "Password must be at most 100 characters."),
    confirmPassword: z
      .string({ message: "Please confirm your password" })
      .min(6, "Password must be at least 6 characters."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { token, error } = Route.useSearch();

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

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
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Choose a new password</CardTitle>
          <CardDescription>
            {invalidLink
              ? "This reset link is invalid or has expired."
              : "Enter a new password for your account."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invalidLink ? (
            <div className="space-y-4">
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
              <FieldGroup>
                <Controller
                  control={form.control}
                  name="password"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>New password</FieldLabel>
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
                    disabled={form.formState.isSubmitting}
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
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
