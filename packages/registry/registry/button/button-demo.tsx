import { Button } from "@workspace/ui/components/shadcn/button";
import { ArrowRight, Loader2, Mail } from "lucide-react";

/**
 * button-demo — a `registry:ui` example. One self-contained component that shows
 * the Button's variants, sizes, and states. Rendered inline by `ComponentPreview`
 * and full-screen at `/view/button`.
 */
export default function ButtonDemo() {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button>Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="link">Link</Button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button size="sm">Small</Button>
        <Button size="default">Default</Button>
        <Button size="lg">Large</Button>
        <Button size="icon" variant="outline">
          <Mail />
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button>
          <Mail />
          With icon
        </Button>
        <Button variant="outline">
          Continue
          <ArrowRight />
        </Button>
        <Button disabled>
          <Loader2 className="animate-spin" />
          Loading
        </Button>
      </div>
    </div>
  );
}
