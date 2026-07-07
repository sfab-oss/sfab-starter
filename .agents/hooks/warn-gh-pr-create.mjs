#!/usr/bin/env node
/**
 * Warn — don't block — when a shell command opens a PR with `gh pr create`.
 *
 * `gh pr create` is the repo's supported PR flow (see `.husky/pre-push`), so we
 * never deny it. We only surface a reminder: link the PR to its sfab task and
 * comment back on the task, otherwise the automated AI review may not trigger
 * (the lesson from PR #40, whose review never ran).
 *
 * Cross-runtime: the same script backs Claude Code's PreToolUse hook and
 * Cursor's beforeShellExecution hook. It auto-detects which one called it from
 * the stdin payload shape and emits that runtime's non-blocking "allow + note"
 * JSON. A non-matching command produces no output (exit 0) so normal permission
 * flow is untouched.
 *
 *   Claude  → { tool_input: { command } }  → PreToolUse allow + systemMessage
 *   Cursor  → { command }                  → permission "allow" + userMessage
 */

const REMINDER =
  "Opening a PR with `gh pr create` is fine. Before/after: make sure the PR " +
  "body links its sfab task (e.g. ALW-123) and add a comment on that task " +
  "linking the PR — otherwise the automated AI review may not trigger.";

function readStdin() {
  return new Promise((resolve) => {
    let buf = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      buf += chunk;
    });
    process.stdin.on("end", () => resolve(buf));
    // If nothing is piped in, don't hang.
    if (process.stdin.isTTY) {
      resolve("");
    }
  });
}

// Match `gh pr create` only in command position — line start (the `m` flag
// makes `^` match after each newline) or right after a shell separator,
// including a bare newline — so an incidental mention in a commit message, a
// quoted string, or `gh pr view` never trips it, while a multi-line Bash call
// with `gh pr create` on its own line still does.
const GH_PR_CREATE = /(^|[;&|(`\n])\s*gh\s+pr\s+create\b/m;

async function main() {
  const raw = await readStdin();
  let payload = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    // Unparseable input: stay silent, let the command proceed.
    process.exit(0);
  }

  const isClaude = typeof payload?.tool_input === "object";
  const command = payload?.tool_input?.command || payload?.command || "";

  if (typeof command !== "string" || !GH_PR_CREATE.test(command)) {
    // Not a PR-create command: emit nothing, proceed normally.
    process.exit(0);
  }

  if (isClaude) {
    // Intent is fully expressed by permissionDecision: "allow"; no top-level
    // `continue` (default) so the payload stays minimal.
    process.stdout.write(
      JSON.stringify({
        systemMessage: REMINDER,
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "allow",
          additionalContext: REMINDER,
        },
      })
    );
  } else {
    process.stdout.write(
      JSON.stringify({
        continue: true,
        permission: "allow",
        userMessage: REMINDER,
        agentMessage: REMINDER,
      })
    );
  }
  process.exit(0);
}

main();
