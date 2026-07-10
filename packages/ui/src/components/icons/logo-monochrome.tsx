import type { SVGProps } from "react";

/**
 * Neutral placeholder brand mark for the starter — a generic geometric glyph in
 * `currentColor`, no vertical or company identity baked in. Swap this SVG (and
 * the app name in the sidebar / onboarding) when you brand a downstream app.
 */
export const LogoMark = (props: SVGProps<SVGSVGElement>) => (
  <svg
    fill="none"
    height="24"
    viewBox="0 0 24 24"
    width="24"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <title>Logo</title>
    <rect fill="currentColor" height="7" rx="2" width="7" x="3" y="3" />
    <rect fill="currentColor" height="7" rx="2" width="7" x="14" y="3" />
    <rect fill="currentColor" height="7" rx="2" width="7" x="3" y="14" />
    <rect
      fill="currentColor"
      fillOpacity="0.5"
      height="7"
      rx="2"
      width="7"
      x="14"
      y="14"
    />
  </svg>
);
