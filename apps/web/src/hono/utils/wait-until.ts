import { waitUntil as cfWaitUntil } from "cloudflare:workers";

export function safeWaitUntil(promise: Promise<unknown>): void {
  try {
    cfWaitUntil(promise);
  } catch {
    /* Workers runtime unavailable in dev */
  }
}
