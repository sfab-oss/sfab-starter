import { DurableObject } from "cloudflare:workers";

/**
 * Minimal Durable Object used by the in-workerd reference test (ALW-305).
 * Exercised via `runInDurableObject` — not wired to any production route. It
 * exists only to prove the vitest-pool-workers `workers` project can construct a
 * real DO in workerd and drive its storage, so future Tier-2 DO tests (Think /
 * OrgAgent, ALW-218) have a working pattern to copy.
 */
export class TestCounter extends DurableObject<Cloudflare.Env> {
  async increment(): Promise<number> {
    const count = ((await this.ctx.storage.get<number>("count")) ?? 0) + 1;
    await this.ctx.storage.put("count", count);
    return count;
  }

  async getCount(): Promise<number> {
    return (await this.ctx.storage.get<number>("count")) ?? 0;
  }
}
