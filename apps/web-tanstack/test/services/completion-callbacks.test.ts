import { describe, expect, it, vi } from "vitest";
import { createCompletionCallbacks } from "../../src/lib/ai/utils/stream/completion-callbacks";

function makeResponseMessage() {
  return {
    id: "msg_test",
    role: "assistant" as const,
    parts: [{ type: "text" as const, text: "Hello" }],
    metadata: { createdAt: new Date().toISOString(), status: "success" },
  };
}

describe("createCompletionCallbacks", () => {
  it("calls onComplete after onFinish when no error occurred", async () => {
    const onUpsertMessage = vi.fn().mockResolvedValue(undefined);
    const onComplete = vi.fn().mockResolvedValue(undefined);
    const onError = vi.fn().mockResolvedValue(undefined);
    const cleanupTimeout = vi.fn();

    const callbacks = createCompletionCallbacks({
      onUpsertMessage,
      onComplete,
      onError,
      cleanupTimeout,
    });

    await callbacks.onFinish({ responseMessage: makeResponseMessage() });

    expect(onUpsertMessage).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledOnce();
    expect(cleanupTimeout).toHaveBeenCalledOnce();
  });

  it("does NOT call onComplete when onError fired first", async () => {
    const onUpsertMessage = vi.fn().mockResolvedValue(undefined);
    const onComplete = vi.fn().mockResolvedValue(undefined);
    const onError = vi.fn().mockResolvedValue(undefined);
    const cleanupTimeout = vi.fn();

    const callbacks = createCompletionCallbacks({
      onUpsertMessage,
      onComplete,
      onError,
      cleanupTimeout,
    });

    // Error fires first (synchronous, returns string)
    const errorMessage = callbacks.onError(new Error("stream failed"));
    expect(typeof errorMessage).toBe("string");
    expect(onError).toHaveBeenCalledOnce();

    // Then onFinish fires (SDK behavior: onFinish fires even after error)
    await callbacks.onFinish({ responseMessage: makeResponseMessage() });

    // onComplete should NOT have been called — status should stay "failed"
    expect(onComplete).not.toHaveBeenCalled();
    // But message should still be upserted (save partial response)
    expect(onUpsertMessage).toHaveBeenCalledOnce();
  });

  it("cleans up timeout on both onFinish and onError", async () => {
    const cleanupTimeout = vi.fn();

    const callbacks = createCompletionCallbacks({
      onUpsertMessage: vi.fn().mockResolvedValue(undefined),
      cleanupTimeout,
    });

    callbacks.onError(new Error("fail"));
    expect(cleanupTimeout).toHaveBeenCalledTimes(1);

    await callbacks.onFinish({ responseMessage: makeResponseMessage() });
    expect(cleanupTimeout).toHaveBeenCalledTimes(2);
  });

  it("works without optional callbacks", async () => {
    const onUpsertMessage = vi.fn().mockResolvedValue(undefined);
    const cleanupTimeout = vi.fn();

    const callbacks = createCompletionCallbacks({
      onUpsertMessage,
      cleanupTimeout,
    });

    // Should not throw when onComplete/onError are undefined
    await callbacks.onFinish({ responseMessage: makeResponseMessage() });
    expect(onUpsertMessage).toHaveBeenCalledOnce();
  });

  it("onError returns a user-friendly string", () => {
    const callbacks = createCompletionCallbacks({
      onUpsertMessage: vi.fn().mockResolvedValue(undefined),
      cleanupTimeout: vi.fn(),
    });

    const result = callbacks.onError(new Error("something broke"));
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});
