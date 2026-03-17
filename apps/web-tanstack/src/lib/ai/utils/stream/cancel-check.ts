export const CANCEL_CHECK_INTERVAL_MS = 1000;

/**
 * Creates a throttled cancel checker that polls at most once per interval.
 * When `checkCanceled` returns true, the given AbortController is aborted.
 */
export function createThrottledCancelCheck(
  checkCanceled: () => Promise<boolean>,
  abortController: AbortController,
  intervalMs = CANCEL_CHECK_INTERVAL_MS
) {
  let lastCheck = 0;
  return async () => {
    if (abortController.signal.aborted) {
      return;
    }
    const now = Date.now();
    if (now - lastCheck < intervalMs) {
      return;
    }
    lastCheck = now;
    const canceled = await checkCanceled();
    if (canceled) {
      abortController.abort();
    }
  };
}
