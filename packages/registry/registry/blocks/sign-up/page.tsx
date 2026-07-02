"use client";

import { Toaster } from "@workspace/ui/components/shadcn/sonner";
import { AuthShell } from "./components/auth-shell";
import { SignUpForm } from "./components/sign-up-form";

export default function SignUpPage() {
  return (
    <>
      <AuthShell>
        <SignUpForm />
      </AuthShell>
      <Toaster />
    </>
  );
}
