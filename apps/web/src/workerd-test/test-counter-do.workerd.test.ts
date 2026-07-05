import { runInDurableObject } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { TestCounter } from "./test-counter-do";
import { env } from "./test-env";

/**
 * Reference in-workerd DO test (ALW-305). Proves the `workers` vitest project can
 * instantiate a real Durable Object in workerd and drive it via
 * `runInDurableObject`. Copy this shape for Tier-2 Think / OrgAgent DO tests.
 */
describe("TestCounter (in workerd)", () => {
  it("persists and increments via runInDurableObject", async () => {
    const id = env.TEST_COUNTER.idFromName("reference-counter");
    const stub = env.TEST_COUNTER.get(id);

    const first = await runInDurableObject(stub, (instance: TestCounter) =>
      instance.increment()
    );
    expect(first).toBe(1);

    const second = await runInDurableObject(
      stub,
      async (instance: TestCounter, state) => {
        expect(instance).toBeInstanceOf(TestCounter);
        expect(await state.storage.get<number>("count")).toBe(1);
        return instance.increment();
      }
    );
    expect(second).toBe(2);
  });
});
