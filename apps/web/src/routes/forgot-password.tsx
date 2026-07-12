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
import { m } from "@/paraglide/messages.js";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

interface ForgotPasswordValues {
  email: string;
}

function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  const forgotPasswordSchema = z.object({
    email: z.email({ message: m.auth_email_required() }),
  });

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
      toast.error(error.message ?? m.auth_error_generic());
      return;
    }

    setSubmitted(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{m.auth_forgot_title()}</CardTitle>
          <CardDescription>
            {submitted
              ? m.auth_forgot_description_sent()
              : m.auth_forgot_description()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">
                {m.auth_forgot_check_email()}
              </p>
              <Link
                className="inline-flex h-9 w-full items-center justify-center rounded-md border border-input bg-background px-4 py-2 font-medium text-sm shadow-xs hover:bg-accent hover:text-accent-foreground"
                to="/login"
              >
                {m.auth_forgot_back_to_login()}
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
                      <FieldLabel htmlFor={field.name}>
                        {m.auth_email()}
                      </FieldLabel>
                      <Input
                        {...field}
                        aria-invalid={fieldState.invalid}
                        autoComplete="email"
                        id={field.name}
                        placeholder={m.auth_email_placeholder()}
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
                      ? m.auth_forgot_sending()
                      : m.auth_forgot_send()}
                  </Button>
                  <p className="text-center text-muted-foreground text-sm">
                    {m.auth_forgot_remember()}{" "}
                    <Link
                      className="underline-offset-4 hover:underline"
                      to="/login"
                    >
                      {m.auth_log_in()}
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
