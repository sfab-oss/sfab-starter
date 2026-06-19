// Post-processes `src/env.d.ts` after `wrangler types` writes it.
//
// `env.d.ts` is consumed by every workspace package that touches Cloudflare
// runtime types — including packages on stricter `node16`/`nodenext` module
// resolution. Wrangler's raw output occasionally embeds cross-package
// import-typed references that those consumers can't follow. We strip them
// here so the shared file stays portable.
//
// Currently strips:
//
//   1. `interface GlobalProps { ... }` — references the worker entry module
//      via `mainModule: typeof import("../../../apps/web/src/server")`.
//   2. `DurableObjectNamespace<import("../../../apps/web/src/...").Class>`
//      — added whenever a DO binding is declared. Replaced with the bare
//      `DurableObjectNamespace` type.
//   3. `Workflow<Parameters<import("../../../apps/web/src/...").Class['run']>...>`
//      — added whenever a Workflows binding is declared. Replaced with the bare
//      `Workflow` type.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const envFile = resolve(here, "../src/env.d.ts");

let source = readFileSync(envFile, "utf8");

source = source.replace(/\tinterface GlobalProps \{[\s\S]*?\n\t\}\n/, "");

source = source.replace(
  /DurableObjectNamespace<import\([^)]*\)\.\w+>/g,
  "DurableObjectNamespace"
);

source = source.replace(
  /(?<![A-Za-z])Workflow<[^;\n]*import\([^)]*\)[^;\n]*>/g,
  "Workflow"
);

writeFileSync(envFile, source);
