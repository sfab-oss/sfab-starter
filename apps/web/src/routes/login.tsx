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
import { LanguageSwitcher } from "@/components/common/language-switcher";
import { m } from "@/paraglide/messages.js";

export const Route = createFileRoute("/login")({ component: LoginPage });

interface LoginValues {
  email: string;
  password: string;
}

function LoginPage() {
  const navigate = useNavigate();

  const loginSchema = z.object({
    email: z.email({ message: m.auth_email() }),
    password: z.string({ message: m.auth_password() }).min(6),
  });

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginValues) => {
    const result = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });

    if (result.error) {
      toast.error(result.error.message ?? m.auth_error_generic());
    } else {
      toast.success(m.auth_login_success());
      await navigate({ to: "/" });
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-muted">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{m.auth_login_title()}</CardTitle>
          <CardDescription>{m.auth_login_description()}</CardDescription>
        </CardHeader>
        <CardContent>
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
                      placeholder="m@example.com"
                      type="email"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="password"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <div className="flex items-center">
                      <FieldLabel htmlFor={field.name}>
                        {m.auth_password()}
                      </FieldLabel>
                      <Link
                        className="ml-auto text-sm underline-offset-4 hover:underline"
                        to="/forgot-password"
                      >
                        {m.auth_forgot_password()}
                      </Link>
                    </div>
                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      autoComplete="current-password"
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
                <Button disabled={form.formState.isSubmitting} type="submit">
                  {form.formState.isSubmitting
                    ? m.auth_login_submitting()
                    : m.auth_login()}
                </Button>
                <p className="text-center text-muted-foreground text-sm">
                  {m.auth_no_account()}{" "}
                  <Link
                    className="underline-offset-4 hover:underline"
                    to="/signup"
                  >
                    {m.auth_signup()}
                  </Link>
                </p>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
