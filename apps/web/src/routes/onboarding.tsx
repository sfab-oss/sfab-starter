import { createFileRoute } from "@tanstack/react-router";
import { LogoMark } from "@workspace/ui/components/icons/logo-monochrome";
import { CreateOrganizationForm } from "@/components/organization/create-organization-form";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

function OnboardingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <LogoMark className="size-12" />
          </div>
          <div className="space-y-2">
            <h1 className="font-bold text-3xl">Welcome</h1>
            <p className="text-lg text-muted-foreground">
              Let's create your organization to get started
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <CreateOrganizationForm className="space-y-6" />
        </div>

        <div className="text-center text-muted-foreground text-sm">
          <p>
            You can invite team members and manage settings after creating your
            organization.
          </p>
        </div>
      </div>
    </div>
  );
}
