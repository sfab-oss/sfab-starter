import { cloudflare } from "@cloudflare/vite-plugin";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import agents from "agents/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const config = defineConfig({
  environments: {
    // @cloudflare/vite-plugin 1.53 SSR-optimizes the worker graph with Rolldown.
    // TanStack Devtools pulls solid-js/web `use`, which the Solid server build
    // does not export — vite dev crashes at optimizer start without this exclude.
    ssr: {
      optimizeDeps: {
        exclude: [
          "@tanstack/devtools-ui",
          "@tanstack/react-devtools",
          "solid-js",
          "solid-js/web",
        ],
      },
    },
  },
  plugins: [
    // Vite 8/Oxc does not lower stage-3 decorators (`@callable` on OrgAgent).
    babel({
      plugins: [["@babel/plugin-proposal-decorators", { version: "2023-11" }]],
    }),
    agents(),
    devtools({ eventBusConfig: { port: 42_085 } }),
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    paraglideVitePlugin({
      project: "../../packages/i18n/project.inlang",
      outdir: "./src/paraglide",
      outputStructure: "message-modules",
      cookieName: "PARAGLIDE_LOCALE",
      strategy: ["cookie", "baseLocale"],
      emitTsDeclarations: true,
    }),
  ],
});

export default config;
