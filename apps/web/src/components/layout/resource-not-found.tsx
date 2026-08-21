import { Link } from "@tanstack/react-router";
import { ShellPage } from "@workspace/ui/components/brand/shell";
import { Button } from "@workspace/ui/components/shadcn/button";

interface ResourceNotFoundProps {
  title: string;
  backLabel: string;
  to: "/catalog" | "/entities" | "/documents";
}

export function ResourceNotFound({
  title,
  backLabel,
  to,
}: ResourceNotFoundProps) {
  return (
    <ShellPage>
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <h2 className="font-semibold text-xl">{title}</h2>
        <Button render={<Link to={to} />}>{backLabel}</Button>
      </div>
    </ShellPage>
  );
}
