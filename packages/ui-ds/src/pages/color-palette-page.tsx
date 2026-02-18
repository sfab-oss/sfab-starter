"use client";

import { cn } from "@workspace/ui/lib/utils";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import {
  DesignSystemLayoutContent,
  DesignSystemLayoutPage,
} from "../components/view/design-system-layout";

interface ColorVariable {
  name: string;
  cssVar: string;
  description?: string;
}

interface ColorGroup {
  title: string;
  description?: string;
  colors: ColorVariable[];
}

const colorGroups: ColorGroup[] = [
  {
    title: "Base Colors",
    description: "Core semantic colors used throughout the application.",
    colors: [
      {
        name: "Background",
        cssVar: "--background",
        description: "Default page background",
      },
      {
        name: "Foreground",
        cssVar: "--foreground",
        description: "Default text color",
      },
    ],
  },
  {
    title: "Card & Popover",
    description: "Colors for elevated surfaces like cards and popovers.",
    colors: [
      { name: "Card", cssVar: "--card", description: "Card background" },
      {
        name: "Card Foreground",
        cssVar: "--card-foreground",
        description: "Card text color",
      },
      {
        name: "Popover",
        cssVar: "--popover",
        description: "Popover background",
      },
      {
        name: "Popover Foreground",
        cssVar: "--popover-foreground",
        description: "Popover text color",
      },
    ],
  },
  {
    title: "Primary & Secondary",
    description: "Main action and secondary colors.",
    colors: [
      {
        name: "Primary",
        cssVar: "--primary",
        description: "Primary actions and emphasis",
      },
      {
        name: "Primary Foreground",
        cssVar: "--primary-foreground",
        description: "Text on primary background",
      },
      {
        name: "Secondary",
        cssVar: "--secondary",
        description: "Secondary actions",
      },
      {
        name: "Secondary Foreground",
        cssVar: "--secondary-foreground",
        description: "Text on secondary background",
      },
    ],
  },
  {
    title: "Muted & Accent",
    description: "Subtle backgrounds and accent colors.",
    colors: [
      {
        name: "Muted",
        cssVar: "--muted",
        description: "Muted backgrounds",
      },
      {
        name: "Muted Foreground",
        cssVar: "--muted-foreground",
        description: "Muted text",
      },
      {
        name: "Accent",
        cssVar: "--accent",
        description: "Accent highlights",
      },
      {
        name: "Accent Foreground",
        cssVar: "--accent-foreground",
        description: "Text on accent background",
      },
    ],
  },
  {
    title: "Destructive",
    description: "Colors for destructive actions and errors.",
    colors: [
      {
        name: "Destructive",
        cssVar: "--destructive",
        description: "Error and destructive actions",
      },
      {
        name: "Destructive Foreground",
        cssVar: "--destructive-foreground",
        description: "Text on destructive background",
      },
    ],
  },
  {
    title: "Borders & Inputs",
    description: "Colors for borders, inputs, and focus rings.",
    colors: [
      {
        name: "Border",
        cssVar: "--border",
        description: "Default border color",
      },
      { name: "Input", cssVar: "--input", description: "Input border color" },
      { name: "Ring", cssVar: "--ring", description: "Focus ring color" },
    ],
  },
  {
    title: "Chart Colors",
    description: "Colors for data visualizations and charts.",
    colors: [
      {
        name: "Chart 1",
        cssVar: "--chart-1",
        description: "Primary chart color",
      },
      {
        name: "Chart 2",
        cssVar: "--chart-2",
        description: "Secondary chart color",
      },
      {
        name: "Chart 3",
        cssVar: "--chart-3",
        description: "Tertiary chart color",
      },
      {
        name: "Chart 4",
        cssVar: "--chart-4",
        description: "Fourth chart color",
      },
      {
        name: "Chart 5",
        cssVar: "--chart-5",
        description: "Fifth chart color",
      },
    ],
  },
  {
    title: "Sidebar",
    description: "Colors specific to the sidebar component.",
    colors: [
      {
        name: "Sidebar",
        cssVar: "--sidebar",
        description: "Sidebar background",
      },
      {
        name: "Sidebar Foreground",
        cssVar: "--sidebar-foreground",
        description: "Sidebar text color",
      },
      {
        name: "Sidebar Primary",
        cssVar: "--sidebar-primary",
        description: "Sidebar primary color",
      },
      {
        name: "Sidebar Primary Foreground",
        cssVar: "--sidebar-primary-foreground",
        description: "Text on sidebar primary",
      },
      {
        name: "Sidebar Accent",
        cssVar: "--sidebar-accent",
        description: "Sidebar accent/hover color",
      },
      {
        name: "Sidebar Accent Foreground",
        cssVar: "--sidebar-accent-foreground",
        description: "Text on sidebar accent",
      },
      {
        name: "Sidebar Border",
        cssVar: "--sidebar-border",
        description: "Sidebar border color",
      },
      {
        name: "Sidebar Ring",
        cssVar: "--sidebar-ring",
        description: "Sidebar focus ring color",
      },
    ],
  },
];

function ColorSwatch({ name, cssVar, description }: ColorVariable) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(`var(${cssVar})`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      className="group flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
      onClick={handleCopy}
      type="button"
    >
      <div className="flex w-full items-center gap-3">
        <div
          className="h-12 w-12 shrink-0 rounded-md border shadow-sm"
          style={{ backgroundColor: `var(${cssVar})` }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{name}</span>
            <span
              className={cn(
                "text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100",
                copied && "text-green-600 opacity-100"
              )}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </span>
          </div>
          <code className="text-muted-foreground text-xs">{cssVar}</code>
        </div>
      </div>
      {description && (
        <p className="text-muted-foreground text-xs">{description}</p>
      )}
    </button>
  );
}

export function ColorPalettePage() {
  return (
    <DesignSystemLayoutPage>
      <DesignSystemLayoutContent>
        <div className="container mx-auto space-y-10 p-6">
          <div className="space-y-4">
            <h1 className="font-bold text-4xl tracking-tight">Color Palette</h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              These are the CSS custom properties used throughout the design
              system. Colors are defined using the OKLch color space for better
              perceptual uniformity and support both light and dark themes.
            </p>
          </div>

          <div className="space-y-10">
            {colorGroups.map((group) => (
              <section className="space-y-4" key={group.title}>
                <div className="space-y-1">
                  <h2 className="font-semibold text-2xl">{group.title}</h2>
                  {group.description && (
                    <p className="text-muted-foreground">{group.description}</p>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {group.colors.map((color) => (
                    <ColorSwatch key={color.cssVar} {...color} />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <section className="space-y-4 rounded-lg border bg-muted/30 p-6">
            <h2 className="font-semibold text-xl">Usage</h2>
            <div className="space-y-3 text-sm">
              <p>
                Use these CSS variables with the{" "}
                <code className="rounded bg-muted px-1.5 py-0.5">var()</code>{" "}
                function or the corresponding Tailwind utility classes:
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="font-medium">CSS</p>
                  <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
                    {`background-color: var(--primary);
color: var(--primary-foreground);`}
                  </pre>
                </div>
                <div className="space-y-2">
                  <p className="font-medium">Tailwind</p>
                  <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
                    {`<div className="bg-primary text-primary-foreground">
  ...
</div>`}
                  </pre>
                </div>
              </div>
            </div>
          </section>
        </div>
      </DesignSystemLayoutContent>
    </DesignSystemLayoutPage>
  );
}
