import { Generator, getConfig } from "@tanstack/router-generator";

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
 * @tanstack/router-generator is the package the Vite plugin uses internally to
 * produce this file; it is declared as a direct devDependency so the script
 * depends on it explicitly instead of reaching through the plugin.
 */
const root = process.cwd();
const config = await getConfig({}, root);

await new Generator({ config, root }).run();
