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
