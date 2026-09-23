// `pnpm verify`: the checks CI runs, locally, in order, stopping at the first
// failure. The factory runs this before it pushes an agent's work, and the
// pre-push hook runs it for humans, so red CI is caught before it costs a run.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const STEPS = [
  "pnpm lint:check",
  "pnpm i18n:lint",
  "pnpm --filter @workspace/registry generate:check",
  "pnpm typecheck",
  "pnpm check:cycles",
  "pnpm i18n:compile",
  "pnpm test",
  "pnpm build",
];

const CI_FILE = ".github/workflows/ci.yml";
const SETUP_STEPS = new Set(["pnpm install --frozen-lockfile"]);
const RUN_LINE = /^\s*(?:- )?run:\s*(.*)$/;

// A step added to CI but not here would let red code through, so the lists
// must match exactly.
function ciSteps() {
  const steps = [];
  for (const line of readFileSync(CI_FILE, "utf8").split("\n")) {
    const match = line.match(RUN_LINE);
    if (!match) {
      continue;
    }
    const command = match[1].trim();
    if (command === "" || command === "|" || command === ">") {
      fail(
        `${CI_FILE} has a multi-line run step; list it in scripts/verify.mjs by hand.`
      );
    }
    if (!SETUP_STEPS.has(command)) {
      steps.push(command);
    }
  }
  return steps;
}

function fail(message) {
  console.error(`\n✘ verify: ${message}`);
  process.exit(1);
}

const inCi = ciSteps();
const missing = inCi.filter((step) => !STEPS.includes(step));
const extra = STEPS.filter((step) => !inCi.includes(step));
if (missing.length > 0 || extra.length > 0) {
  fail(
    `scripts/verify.mjs and ${CI_FILE} disagree.\n` +
      `  In CI, not in verify: ${missing.join(", ") || "none"}\n` +
      `  In verify, not in CI: ${extra.join(", ") || "none"}`
  );
}

// The Vite build can OOM under the default Node heap on memory-constrained machines.
const env = {
  ...process.env,
  NODE_OPTIONS: process.env.NODE_OPTIONS ?? "--max-old-space-size=8192",
};

for (const step of STEPS) {
  console.log(`\n▶ ${step}`);
  const result = spawnSync(step, { stdio: "inherit", shell: true, env });
  if (result.status !== 0) {
    fail(`\`${step}\` failed.`);
  }
}
console.log("\n✔ verify: all CI checks passed.");
