import { waitUntil as cfWaitUntil } from "cloudflare:workers";

/**
 * Keeps the Worker execution context alive until the promise settles.
 * In dev mode (Node.js), the import may fail — safely no-ops.
 */
export function safeWaitUntil(promise: Promise<unknown>): void {
  try {
    cfWaitUntil(promise);
  } catch {
    // Dev mode — Node.js process stays alive naturally via event loop
  }
}
