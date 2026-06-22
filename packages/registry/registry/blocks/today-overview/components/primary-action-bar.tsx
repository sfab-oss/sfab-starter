"use client";

import { Button } from "@workspace/ui/components/shadcn/button";
import { cn } from "@workspace/ui/lib/utils";
import { Banknote, ShoppingCart } from "lucide-react";

export interface PrimaryAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  disabledReason?: string;
  variant?: "default" | "outline";
}

export type PrimaryActionBarProps = React.ComponentProps<"div"> & {
  actions?: PrimaryAction[];
};

const DEFAULT_ACTIONS: PrimaryAction[] = [
  {
    id: "sell",
    label: "New sale",
    icon: <ShoppingCart className="size-4" />,
  },
  {
    id: "collect",
    label: "Collect payment",
    icon: <Banknote className="size-4" />,
    variant: "outline",
  },
];

export function PrimaryActionBar({
  actions = DEFAULT_ACTIONS,
  className,
  ...props
}: PrimaryActionBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3",
        className
      )}
      data-slot="primary-action-bar"
      {...props}
    >
      {actions.map((action) => (
        <Button
          disabled={action.disabled}
          key={action.id}
          onClick={action.onClick}
          title={action.disabled ? action.disabledReason : undefined}
          type="button"
          variant={action.variant ?? "default"}
        >
          {action.icon}
          {action.label}
        </Button>
      ))}
    </div>
  );
}
