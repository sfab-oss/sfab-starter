"use client";

import { Toaster } from "@workspace/ui/components/shadcn/sonner";
import { AuthShell } from "./components/auth-shell";
import { SignInForm } from "./components/sign-in-form";

export default function SignInPage() {
  return (
    <>
      <AuthShell>
        <SignInForm />
      </AuthShell>
      <Toaster />
    </>
  );
}
