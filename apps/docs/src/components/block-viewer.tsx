"use client";

import { getEntry, getIframeHeight } from "@workspace/registry";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Separator } from "@workspace/ui/components/shadcn/separator";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/shadcn/toggle-group";
import { cn } from "@workspace/ui/lib/utils";
import {
  Fullscreen,
  Monitor,
  RotateCw,
  Smartphone,
  Tablet,
} from "lucide-react";
import { useState } from "react";

/**
 * BlockViewer — embeds a full-page block (`/view/$name`) in an iframe with
 * device-width breakpoints, a refresh control, and an "open full screen" link.
 *
 * A deliberately lightweight take on shadcn / ui-ds's block-viewer: we borrow
 * the iframe + breakpoint + open-in-new-tab pattern but skip the file tree and
 * syntax-highlighted source panel. The entry comes from `@workspace/registry`
 * (the generated map); this viewer lives in the docs app so `@workspace/ui` and
 * the registry package stay free of app chrome.
 */

const WIDTHS = [
  {
    value: "desktop",
    label: "Desktop",
    icon: Monitor,
    css: "100%",
  },
  {
    value: "tablet",
    label: "Tablet",
    icon: Tablet,
    css: "768px",
  },
  {
    value: "mobile",
    label: "Mobile",
    icon: Smartphone,
    css: "390px",
  },
] as const;
type WidthValue = (typeof WIDTHS)[number]["value"];
export function BlockViewer({ name }: { name: string }) {
  const [width, setWidth] = useState<WidthValue>("desktop");
  const [iframeKey, setIframeKey] = useState(0);
  const block = getEntry(name);
  if (!block) {
    return (
      <div className="not-prose rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-destructive text-sm">
        Unknown block: <code>{name}</code>
      </div>
    );
  }
  const css = WIDTHS.find((w) => w.value === width)?.css ?? "100%";
  return (
    <div
      className="not-prose flex flex-col gap-3"
      style={
        {
          "--block-height": `${getIframeHeight(block)}px`,
        } as React.CSSProperties
      }
    >
      <div className="flex items-center gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-sm">{block.title}</p>
          <p className="truncate text-muted-foreground text-xs">
            {block.description}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-1 rounded-md border p-1">
          <ToggleGroup
            onValueChange={(value) => {
              const next = value[0];
              if (next) {
                setWidth(next as WidthValue);
              }
            }}
            value={[width]}
          >
            {WIDTHS.map((w) => (
              <ToggleGroupItem
                className="size-7 rounded-sm p-0"
                key={w.value}
                title={w.label}
                value={w.value}
              >
                <w.icon className="size-4" />
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Separator className="mx-0.5 h-4" orientation="vertical" />
          <Button
            className="size-7 rounded-sm p-0"
            onClick={() => setIframeKey((k) => k + 1)}
            size="icon"
            title="Refresh"
            variant="ghost"
          >
            <RotateCw className="size-4" />
            <span className="sr-only">Refresh preview</span>
          </Button>
          <Button
            className="size-7 rounded-sm p-0"
            render={
              <a
                href={`/view/${name}`}
                rel="noreferrer"
                target="_blank"
                title="Open full screen"
              >
                <span className="sr-only">Open full screen</span>
              </a>
            }
            size="icon"
            variant="ghost"
          >
            <Fullscreen className="size-4" />
            <span className="sr-only">Open full screen</span>
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-muted/30 p-2">
        <div
          className={cn(
            "mx-auto h-(--block-height) overflow-hidden rounded-lg border bg-background transition-[max-width] duration-300 ease-out"
          )}
          style={{
            maxWidth: css,
          }}
        >
          <iframe
            className="size-full"
            key={iframeKey}
            loading="lazy"
            src={`/view/${name}`}
            title={block.title}
          />
        </div>
      </div>
    </div>
  );
}
