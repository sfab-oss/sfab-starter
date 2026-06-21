import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * Layer-1 harness (ADR-0017 Decision 5 / 2026-06-21 amendment).
 *
 * The registry package is its own test home: the items it ships are imported and
 * rendered here in jsdom so a broken block fails CI in-repo, before it can ever be
 * `shadcn add`-ed into an adopter. `@vitejs/plugin-react` gives the demos JSX +
 * Fast Refresh-free transform; `test/setup.ts` stubs the browser APIs the shadcn
 * shell primitives reach for (matchMedia, ResizeObserver, scrollIntoView).
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.test.{ts,tsx}"],
  },
});
