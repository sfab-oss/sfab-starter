import { createRequire } from "node:module";

/**
 * Generate the TanStack Router route tree (src/routeTree.gen.ts) before type
 * checking.
 *
 * The Vite plugin produces this file during dev/build, but the `typecheck`
 * script runs `tsc` directly without a prior build, so the generated route
 * tree would be missing and every `createFileRoute` / navigation call would
 * fail to type check. Generating it here keeps `pnpm typecheck` self-contained
 * and green in CI.
 *
 * The generator ships as a dependency of @tanstack/router-plugin (already a
 * dependency of this app), so we resolve it through the plugin rather than
 * adding a separate dependency.
 */
const requireFromHere = createRequire(import.meta.url);
const generatorEntry = createRequire(
  requireFromHere.resolve("@tanstack/router-plugin")
).resolve("@tanstack/router-generator");

const { Generator, getConfig } = await import(generatorEntry);

const root = process.cwd();
const config = await getConfig({}, root);

await new Generator({ config, root }).run();
