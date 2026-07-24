import type { KnipConfig } from "knip";

// Dead-code detection for the sfab-starter monorepo. Refreshed for knip 6
// (ALW-692) after TypeScript 7 broke knip 5 (`typescript` peer `<7`).
//
// Conventions (same as sfab):
// - `entry` lists only what Knip CAN'T auto-derive from package.json
//   exports / scripts. Prefer deleting redundant entries over listing everything.
// - `!` suffix = follow imports but don't check that file's own exports.
// - `ignoreDependencies` documents deps used through channels static analysis
//   can't see (CSS @import/@plugin, tsconfig ambient include, inlang project
//   plugins, peer-resolution). Each entry needs a one-line reason.
const config: KnipConfig = {
  workspaces: {
    "apps/web": {
      entry: [
        // Test-only worker main, bound via wrangler.test.jsonc (not package.json).
        "src/workerd-test/worker-entry.ts!",
        "src/**/*.{test,spec}.{ts,tsx}",
        "src/**/*.workerd.test.ts",
        "test/**/*.{ts,tsx}",
      ],
      project: ["src/**/*.{ts,tsx}", "test/**/*.{ts,tsx}"],
      ignoreDependencies: [
        // Tailwind v4 via `@import` in CSS (imported as `?url` / side-effect).
        "tailwindcss",
        // Pulled in by vite/tanstack plugin tooling; not always a direct import.
        "@tanstack/router-plugin",
        "@tanstack/react-router-ssr-query",
        // Opt-in vitest UI assertions.
        "@testing-library/dom",
        "@testing-library/react",
        // Agent model + sandbox shell — wired via config / dynamic provider paths.
        "@ai-sdk/google",
        "@cloudflare/shell",
      ],
    },
    "apps/docs": {
      project: ["src/**/*.{ts,tsx}"],
      ignoreDependencies: [
        // Docs shell mirrors UI deps for local examples / fumadocs styling.
        "class-variance-authority",
        "radix-ui",
        "tailwindcss",
        "clsx",
        "tailwind-merge",
        "@tanstack/router-plugin",
      ],
    },
    "packages/agent": {
      project: ["src/**/*.ts"],
      ignoreDependencies: [
        // Ambient `Env` via tsconfig include of packages/env.
        "@workspace/env",
      ],
    },
    "packages/auth": {
      project: ["src/**/*.ts"],
      ignoreDependencies: ["@workspace/env"],
    },
    "packages/contract": {
      project: ["src/**/*.ts"],
    },
    "packages/core": {
      project: ["src/**/*.ts"],
      ignoreDependencies: ["@workspace/env"],
    },
    "packages/db": {
      entry: ["drizzle.config*.ts!"],
      project: ["src/**/*.ts", "drizzle.config*.ts"],
      ignoreDependencies: ["@workspace/env"],
    },
    "packages/email": {
      project: ["src/**/*.{ts,tsx}"],
      ignoreDependencies: ["@workspace/env"],
    },
    "packages/env": {
      project: ["src/**/*.ts"],
    },
    "packages/i18n": {
      project: ["src/**/*.ts", "project.inlang/**"],
      ignoreDependencies: [
        // Loaded by project.inlang settings, not JS imports.
        "@inlang/plugin-m-function-matcher",
        "@inlang/plugin-message-format",
      ],
    },
    "packages/ui": {
      entry: ["src/**/*.tsx", "src/**/*.ts"],
      project: ["src/**/*.{ts,tsx}"],
      ignoreDependencies: [
        // peerDependencies.next mirror for local peer/typecheck resolution.
        "next",
        // Scaffolding / form / tippy paths not always statically reached.
        "@turbo/gen",
        "@hookform/resolvers",
        "nanoid",
        "tippy.js",
      ],
    },
    "packages/registry": {
      entry: [
        "registry/**/*.{ts,tsx}!",
        "scripts/**/*.ts!",
        "test/**/*.{ts,tsx}!",
      ],
      project: [
        "src/**/*.{ts,tsx}",
        "registry/**/*.{ts,tsx}",
        "scripts/**/*.ts",
      ],
      ignoreDependencies: [
        // Toast used from generated block/item trees.
        "sonner",
      ],
    },
  },
  ignore: [
    // Cursor agent hooks — not part of the app graph.
    ".agents/**",
  ],
  // `cloudflare:workers` is Cloudflare's built-in module; Knip normalizes the
  // `:` specifier to `cloudflare`.
  ignoreDependencies: ["cloudflare", "postcss-load-config"],
  // CI deploy workflow invokes the wrangler CLI; not always a root package bin.
  ignoreBinaries: ["wrangler"],
  ignoreExportsUsedInFile: true,
};

export default config;
