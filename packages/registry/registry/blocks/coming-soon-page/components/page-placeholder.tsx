"use client";

import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/shadcn/empty";
import { Clock, FileQuestion, PackageOpen, Plus } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Honest full-page states — a feature that isn't built yet, a route that doesn't
 * resolve, and a built feature with no data. All three are truthful placeholders:
 * never fake data, never a bare 404. Drop one into a route's content slot.
 */

function PagePlaceholder({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Empty className="min-h-full flex-1">
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  );
}

/** A feature on the roadmap but not built yet (e.g. the Buy hub). */
export function ComingSoonPage() {
  return (
    <PagePlaceholder
      description="Purchasing and supplier bills are on the roadmap. The nav entry is here so the shape is honest — no fake data until it ships."
      icon={<Clock />}
      title="Coming soon"
    />
  );
}

/** A route that does not resolve to a record. */
export function NotFoundPage({ onGoHome }: { onGoHome?: () => void }) {
  return (
    <PagePlaceholder
      action={
        <Button onClick={onGoHome} type="button" variant="outline">
          Back to Today
        </Button>
      }
      description="This page does not exist or the record was moved. Check the link or head back to the dashboard."
      icon={<FileQuestion />}
      title="Page not found"
    />
  );
}

/** A built feature with no records yet — offer the create action. */
export function EmptyResourcePage({ onCreate }: { onCreate?: () => void }) {
  return (
    <PagePlaceholder
      action={
        <Button onClick={onCreate} type="button">
          <Plus className="size-4" />
          New order
        </Button>
      }
      description="No orders yet. Create your first one to start tracking sales, payments, and stock."
      icon={<PackageOpen />}
      title="Nothing here yet"
    />
  );
}
