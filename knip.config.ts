import type { KnipConfig } from "knip";

const config: KnipConfig = {
  workspaces: {
    "apps/web": {
      entry: [
        "src/server.ts!",
        "src/router.tsx!",
        "src/routeTree.gen.ts!",
        "test/**/*.{ts,tsx}!",
      ],
      project: ["src/**/*.{ts,tsx}", "test/**/*.{ts,tsx}"],
    },
    "apps/docs": {
      entry: ["build.mjs!"],
      project: ["build.mjs"],
    },
    "packages/agent": {
      entry: ["src/index.ts!", "src/org/index.ts!", "src/org/chat/index.ts!"],
      project: ["src/**/*.ts"],
    },
    "packages/auth": {
      entry: ["src/index.ts!", "src/client.ts!"],
      project: ["src/**/*.ts"],
    },
    "packages/contract": {
      entry: ["src/**/*.ts"],
      project: ["src/**/*.ts"],
    },
    "packages/core": {
      entry: ["src/catalog/index.ts!", "src/**/*.ts"],
      project: ["src/**/*.ts"],
    },
    "packages/db": {
      entry: ["src/index.ts!", "drizzle.config*.ts"],
      project: ["src/**/*.ts"],
    },
    "packages/email": {
      entry: ["src/index.ts!"],
      project: ["src/**/*.ts"],
    },
    "packages/env": {
      entry: ["src/index.ts!"],
      project: ["src/**/*.ts"],
    },
    "packages/ui": {
      entry: ["src/**/*.tsx", "src/**/*.ts"],
      project: ["src/**/*.{ts,tsx}"],
    },
  },
  ignore: [
    "**/worker-configuration.d.ts",
    "packages/env/src/env.d.ts",
    "apps/web/src/routeTree.gen.ts",
  ],
  ignoreDependencies: ["cloudflare:workers"],
  ignoreExportsUsedInFile: true,
};

export default config;
