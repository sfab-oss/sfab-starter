import type { ModelMessage, StepResult } from "ai";

const DOOM_LOOP_THRESHOLD = 3;

/**
 * Detect if the agent is stuck in a doom loop — calling the same tool
 * with identical arguments repeatedly.
 */
// biome-ignore lint/suspicious/noExplicitAny: StepResult generic must be wide to accept any tool configuration
export function detectDoomLoop(steps: StepResult<any>[]): boolean {
  if (steps.length < DOOM_LOOP_THRESHOLD) {
    return false;
  }

  const recentSteps = steps.slice(-DOOM_LOOP_THRESHOLD);

  // Each step may have multiple tool calls; collect the last tool call from each step
  const recentToolCalls = recentSteps
    .map((step) => step.toolCalls.at(-1))
    .filter((tc): tc is NonNullable<typeof tc> => tc != null);

  if (recentToolCalls.length < DOOM_LOOP_THRESHOLD) {
    return false;
  }

  const first = recentToolCalls[0];
  if (!first) {
    return false;
  }

  return recentToolCalls.every(
    (tc) =>
      tc.toolName === first.toolName &&
      JSON.stringify(tc.input) === JSON.stringify(first.input)
  );
}

/**
 * Create a warning message to break the agent out of a doom loop.
 */
export function createDoomLoopWarningMessage(): ModelMessage {
  return {
    role: "user",
    content: [
      {
        type: "text",
        text: "[SYSTEM] You have called the same tool multiple times with identical arguments. This is a loop. Stop and try a different approach or ask the user for help.",
      },
    ],
  };
}
