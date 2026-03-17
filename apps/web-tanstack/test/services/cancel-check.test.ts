import { describe, expect, it, vi } from "vitest";
import { createThrottledCancelCheck } from "../../src/lib/ai/utils/stream/cancel-check";

describe("createThrottledCancelCheck", () => {
  it("calls checkCanceled on first invocation", async () => {
    const checkCanceled = vi.fn().mockResolvedValue(false);
    const abortController = new AbortController();
    const check = createThrottledCancelCheck(
      checkCanceled,
      abortController,
      1000
    );

    await check();
    expect(checkCanceled).toHaveBeenCalledOnce();
  });

  it("throttles calls within the interval", async () => {
    const checkCanceled = vi.fn().mockResolvedValue(false);
    const abortController = new AbortController();
    const check = createThrottledCancelCheck(
      checkCanceled,
      abortController,
      1000
    );

    await check();
    await check();
    await check();
    expect(checkCanceled).toHaveBeenCalledOnce();
  });

  it("allows another call after the interval passes", async () => {
    vi.useFakeTimers();
    try {
      const checkCanceled = vi.fn().mockResolvedValue(false);
      const abortController = new AbortController();
      const check = createThrottledCancelCheck(
        checkCanceled,
        abortController,
        1000
      );

      await check();
      expect(checkCanceled).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1000);

      await check();
      expect(checkCanceled).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("aborts the controller when checkCanceled returns true", async () => {
    const checkCanceled = vi.fn().mockResolvedValue(true);
    const abortController = new AbortController();
    const check = createThrottledCancelCheck(
      checkCanceled,
      abortController,
      1000
    );

    expect(abortController.signal.aborted).toBe(false);
    await check();
    expect(abortController.signal.aborted).toBe(true);
  });

  it("does not abort when checkCanceled returns false", async () => {
    const checkCanceled = vi.fn().mockResolvedValue(false);
    const abortController = new AbortController();
    const check = createThrottledCancelCheck(
      checkCanceled,
      abortController,
      1000
    );

    await check();
    expect(abortController.signal.aborted).toBe(false);
  });

  it("uses custom interval", async () => {
    vi.useFakeTimers();
    try {
      const checkCanceled = vi.fn().mockResolvedValue(false);
      const abortController = new AbortController();
      const check = createThrottledCancelCheck(
        checkCanceled,
        abortController,
        500
      );

      await check();
      expect(checkCanceled).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(499);
      await check();
      expect(checkCanceled).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1);
      await check();
      expect(checkCanceled).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("stops checking after abort (subsequent calls are no-ops due to throttle)", async () => {
    vi.useFakeTimers();
    try {
      let callCount = 0;
      const checkCanceled = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve(callCount >= 2); // cancel on second real call
      });
      const abortController = new AbortController();
      const check = createThrottledCancelCheck(
        checkCanceled,
        abortController,
        100
      );

      await check(); // call 1 — not canceled
      expect(abortController.signal.aborted).toBe(false);

      vi.advanceTimersByTime(100);
      await check(); // call 2 — canceled
      expect(abortController.signal.aborted).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("skips DB check when already aborted", async () => {
    const checkCanceled = vi.fn().mockResolvedValue(false);
    const abortController = new AbortController();
    const check = createThrottledCancelCheck(
      checkCanceled,
      abortController,
      1000
    );

    // Abort before any check
    abortController.abort();

    await check();
    await check();
    expect(checkCanceled).not.toHaveBeenCalled();
  });
});
