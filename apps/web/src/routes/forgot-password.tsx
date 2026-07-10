import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link } from "@tanstack/react-router";
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
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

const forgotPasswordSchema = z.object({
  email: z.email({ message: "Email is required" }),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotPasswordValues) => {
    const redirectTo = `${window.location.origin}/reset-password`;

    const { error } = await authClient.requestPasswordReset({
      email: values.email,
      redirectTo,
    });

    if (error) {
      toast.error(error.message ?? "An error occurred");
      return;
    }

    setSubmitted(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>
            {submitted
              ? "If an account exists for that email, we sent a reset link."
              : "Enter your email and we'll send you a link to reset your password."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Check your email for a reset link. In local development, the
                link is logged to the server console when email delivery is
                mocked.
              </p>
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
                  name="email"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                      <Input
                        {...field}
                        aria-invalid={fieldState.invalid}
                        autoComplete="email"
                        id={field.name}
                        placeholder="m@example.com"
                        type="email"
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
                      ? "Sending reset link..."
                      : "Send reset link"}
                  </Button>
                  <p className="text-center text-muted-foreground text-sm">
                    Remember your password?{" "}
                    <Link
                      className="underline-offset-4 hover:underline"
                      to="/login"
                    >
                      Log in
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
