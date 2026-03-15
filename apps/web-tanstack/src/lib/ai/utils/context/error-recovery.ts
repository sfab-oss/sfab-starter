import { APICallError } from "ai";

/**
 * Check if an error is a context overflow / token limit error.
 */
export function isContextOverflowError(error: unknown): boolean {
  if (APICallError.isInstance(error)) {
    const body = (error.responseBody ?? "").toLowerCase();
    return (
      body.includes("context_length_exceeded") ||
      body.includes("token limit") ||
      body.includes("maximum context length") ||
      body.includes("too many tokens") ||
      body.includes("context window")
    );
  }

  const message = getErrorMessage(error);
  return (
    message.includes("context_length_exceeded") ||
    message.includes("token limit") ||
    message.includes("maximum context length") ||
    message.includes("too many tokens") ||
    message.includes("context window")
  );
}

/**
 * Check if an error is a rate limit error.
 */
export function isRateLimitError(error: unknown): boolean {
  if (APICallError.isInstance(error)) {
    return error.statusCode === 429;
  }

  const message = getErrorMessage(error);
  return (
    message.includes("rate_limit") ||
    message.includes("too_many_requests") ||
    message.includes("rate limit")
  );
}

/**
 * Format an error into a user-friendly message.
 */
export function formatErrorForUser(error: unknown): string {
  if (isContextOverflowError(error)) {
    return "The conversation has grown too long. Please start a new chat.";
  }
  if (isRateLimitError(error)) {
    return "The AI service is temporarily busy. Please try again in a moment.";
  }
  return "An unexpected error occurred. Please try again.";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.toLowerCase();
  }
  if (typeof error === "string") {
    return error.toLowerCase();
  }
  return String(error).toLowerCase();
}
