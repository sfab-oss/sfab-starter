import { Badge } from "@workspace/ui/components/shadcn/badge";
import { BadgeCheck, TriangleAlert } from "lucide-react";

/**
 * badge-demo — a `registry:ui` example showing the Badge variants, including the
 * icon + count patterns. Rendered inline by `ComponentPreview` and full-screen
 * at `/view/badge`.
 */
export default function BadgeDemo() {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <Badge variant="outline">Outline</Badge>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Badge variant="secondary">
          <BadgeCheck />
          Verified
        </Badge>
        <Badge variant="destructive">
          <TriangleAlert />
          Out of stock
        </Badge>
        <Badge className="rounded-full px-2 tabular-nums">8</Badge>
      </div>
    </div>
  );
}
