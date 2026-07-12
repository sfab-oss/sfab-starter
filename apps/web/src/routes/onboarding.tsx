import { createFileRoute } from "@tanstack/react-router";
import { LogoMark } from "@workspace/ui/components/icons/logo-monochrome";
import { LanguageSwitcher } from "@/components/common/language-switcher";
import { CreateOrganizationForm } from "@/components/organization/create-organization-form";
import { m } from "@/paraglide/messages.js";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

function OnboardingPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-8">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <LogoMark className="size-12" />
          </div>
          <div className="space-y-2">
            <h1 className="font-bold text-3xl">{m.onboarding_title()}</h1>
            <p className="text-lg text-muted-foreground">
              {m.onboarding_subtitle()}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <CreateOrganizationForm className="space-y-6" />
        </div>

        <div className="text-center text-muted-foreground text-sm">
          <p>{m.onboarding_footer()}</p>
        </div>
      </div>
    </div>
  );
}
