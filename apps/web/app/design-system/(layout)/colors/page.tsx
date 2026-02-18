import { ColorPalettePage } from "@workspace/ui-ds/pages/color-palette-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Color Palette | Design System",
  description:
    "Explore the CSS custom properties and color variables used throughout the design system.",
};

export default function ColorsPage() {
  return <ColorPalettePage />;
}
