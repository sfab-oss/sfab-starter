import { runInDurableObject } from "cloudflare:test";
import type { OrgAgent } from "@workspace/agent/org";
import { describe, expect, it } from "vitest";
import { env } from "./test-env";

/**
 * ALW-398 AC-3 — the multi-session backend, aligned to the examples/assistant
 * reference. Drives the real OrgAgent DO over RPC via `runInDurableObject`:
 * - the sub-agent registry is the source of truth for chat existence;
 *   `chat_meta` is decoration merged in by `listChats`.
 * - `createChat` / `listChats` / `deleteChat` behave and persist.
 * - deleting the last chat leaves zero chats — there is no `"default"` re-seed.
 * - `onBeforeSubAgent` gates unknown facets with a 404 and admits known ones.
 *
 * Platform note: vitest-pool-workers cannot spawn real sub-agent *facets*
 * (`ctx.exports` / `ctx.facets` are unavailable in the test harness, so
 * `subAgent()` throws). We therefore fake only the registry primitive — a
 * synchronous, `state.storage.sql`-backed table standing in for the facet
 * registry the SDK would otherwise own. Everything exercised below is the real
 * OrgAgent logic; the live turn/transcript path (which needs a model) is
 * verified manually in `pnpm dev`. See the AC-6 findings note.
 */

/**
 * Replace OrgAgent's sub-agent registry methods with a durable, synchronous
 * SQL-backed fake on the given live instance. Durable (DO SQLite) so a fresh
 * stub for the same id still sees prior chats — this is what makes the
 * persistence assertion real.
 */
function installFakeRegistry(o: OrgAgent, sql: SqlStorage): void {
  // runInDurableObject constructs the DO but does not drive the agents async
  // lifecycle (onStart is wrapped and awaited internally). `this.sql` is backed
  // by `ctx.storage.sql` (the same store as `state.storage.sql`), so we create
  // the real chat_meta table here directly — matching OrgAgent.onStart's schema
  // — plus the fake sub-agent registry table.
  sql.exec(
    "CREATE TABLE IF NOT EXISTS chat_meta (id TEXT PRIMARY KEY, title TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)"
  );
  sql.exec(
    "CREATE TABLE IF NOT EXISTS _test_registry (name TEXT PRIMARY KEY, created_at INTEGER NOT NULL)"
  );

  o.subAgent = ((_cls: unknown, name: string) => {
    sql.exec(
      "INSERT OR IGNORE INTO _test_registry (name, created_at) VALUES (?, ?)",
      name,
      Date.now()
    );
    return Promise.resolve(undefined);
  }) as unknown as OrgAgent["subAgent"];

  o.deleteSubAgent = ((_cls: unknown, name: string) => {
    sql.exec("DELETE FROM _test_registry WHERE name = ?", name);
    return Promise.resolve();
  }) as unknown as OrgAgent["deleteSubAgent"];

  o.hasSubAgent = ((_cls: unknown, name: string) =>
    [...sql.exec("SELECT 1 FROM _test_registry WHERE name = ?", name)].length >
    0) as unknown as OrgAgent["hasSubAgent"];

  o.listSubAgents = (() =>
    [
      ...sql.exec(
        "SELECT name, created_at FROM _test_registry ORDER BY created_at"
      ),
    ].map((row) => ({
      name: row.name as string,
      createdAt: row.created_at as number,
    }))) as unknown as OrgAgent["listSubAgents"];
}

describe("OrgAgent multi-session backend (in workerd)", () => {
  it("404s an unknown facet on the real, un-faked registry", async () => {
    // No fake here: `onBeforeSubAgent` → `hasSubAgent` reads the real (empty)
    // registry without spawning, so the gate is exercised end-to-end.
    const stub = env.OrgAgent.get(env.OrgAgent.idFromName("org-real-gate"));
    const res = await runInDurableObject(stub, (o: OrgAgent) =>
      o.onBeforeSubAgent(new Request("http://do/"), {
        className: "OrgChat",
        name: "does-not-exist",
      })
    );
    expect(res).toBeInstanceOf(Response);
    expect((res as Response).status).toBe(404);
  });

  it("creates and lists chats registry-first, isolating per-chat metadata", async () => {
    const stub = env.OrgAgent.get(env.OrgAgent.idFromName("org-lifecycle"));

    const { list, alphaId, betaId } = await runInDurableObject(
      stub,
      async (o: OrgAgent, state) => {
        installFakeRegistry(o, state.storage.sql);
        const alpha = await o.createChat({ title: "Alpha" });
        const beta = await o.createChat({ title: "Beta" });
        return { list: o.listChats(), alphaId: alpha.id, betaId: beta.id };
      }
    );

    expect(alphaId).not.toBe(betaId);
    expect(list.map((c) => c.id).sort((a, b) => a.localeCompare(b))).toEqual(
      [alphaId, betaId].sort((a, b) => a.localeCompare(b))
    );
    // chat_meta decoration is isolated per chat.
    expect(list.find((c) => c.id === alphaId)?.title).toBe("Alpha");
    expect(list.find((c) => c.id === betaId)?.title).toBe("Beta");
  });

  it("deletes chats without re-seeding a default; zero chats is valid", async () => {
    const stub = env.OrgAgent.get(env.OrgAgent.idFromName("org-delete"));

    const { afterOne, afterAll } = await runInDurableObject(
      stub,
      async (o: OrgAgent, state) => {
        installFakeRegistry(o, state.storage.sql);
        const a = await o.createChat();
        const b = await o.createChat();

        await o.deleteChat(a.id);
        const afterOne = o.listChats().map((c) => c.id);

        await o.deleteChat(b.id);
        const afterAll = o.listChats().map((c) => c.id);
        return { afterOne, afterAll, bId: b.id };
      }
    );

    expect(afterOne).toHaveLength(1);
    // No "default" chat is re-created — the registry is genuinely empty.
    expect(afterAll).toEqual([]);
  });

  it("gates an unknown facet (incl. 'default') and admits a created chat", async () => {
    const stub = env.OrgAgent.get(env.OrgAgent.idFromName("org-gate"));

    const { unknownStatus, legacyDefaultStatus, admitted } =
      await runInDurableObject(stub, async (o: OrgAgent, state) => {
        installFakeRegistry(o, state.storage.sql);

        const unknown = await o.onBeforeSubAgent(new Request("http://do/"), {
          className: "OrgChat",
          name: "nope",
        });
        // The legacy hardcoded name is no longer special-cased — it 404s too.
        const legacyDefault = await o.onBeforeSubAgent(
          new Request("http://do/"),
          { className: "OrgChat", name: "default" }
        );

        const chat = await o.createChat();
        const known = await o.onBeforeSubAgent(new Request("http://do/"), {
          className: "OrgChat",
          name: chat.id,
        });

        return {
          unknownStatus: (unknown as Response).status,
          legacyDefaultStatus: (legacyDefault as Response).status,
          admitted: known,
        };
      });

    expect(unknownStatus).toBe(404);
    expect(legacyDefaultStatus).toBe(404);
    // A registered facet falls through (undefined) so the framework forwards it.
    expect(admitted).toBeUndefined();
  });

  it("persists chats across a fresh stub (DO wake)", async () => {
    const id = env.OrgAgent.idFromName("org-persist");

    const created = await runInDurableObject(
      env.OrgAgent.get(id),
      (o: OrgAgent, state) => {
        installFakeRegistry(o, state.storage.sql);
        return o.createChat({ title: "Persisted" });
      }
    );

    // A new stub for the same DO id models a later client connection / wake.
    // The SQL-backed fake registry + chat_meta both survive.
    const list = await runInDurableObject(
      env.OrgAgent.get(id),
      (o: OrgAgent, state) => {
        installFakeRegistry(o, state.storage.sql);
        return o.listChats();
      }
    );

    expect(list.map((c) => c.id)).toContain(created.id);
    expect(list.find((c) => c.id === created.id)?.title).toBe("Persisted");
  });
});

/**
 * ALW-398 AC-4 — the org's single shared workspace at the backend. The parent
 * OrgAgent owns the real `Workspace`; every child chat proxies to it via
 * `SharedWorkspace` RPC, so a file written from one chat is visible to all.
 *
 * In-pool we exercise the parent-owned workspace directly (the child proxy is a
 * thin one-hop forwarder to exactly these methods; the facet hop itself can't be
 * spawned under vitest-pool-workers). This proves the shared-storage semantics
 * that make cross-chat visibility work, that text and binary content round-trip,
 * and that a write fires the `onChange` → `broadcast` signal.
 */
describe("OrgAgent shared workspace (in workerd)", () => {
  it("round-trips a text file through the parent-owned workspace", async () => {
    const stub = env.OrgAgent.get(env.OrgAgent.idFromName("ws-text"));
    const read = await runInDurableObject(stub, async (o: OrgAgent) => {
      // A write from "chat A" and a read from "chat B" both land on the parent
      // workspace — modelled here as two calls on the shared owner.
      await o.writeFile("/shared/note.txt", "hello from chat A");
      return o.readFile("/shared/note.txt");
    });
    expect(read).toBe("hello from chat A");
  });

  it("round-trips binary content (attachment bytes)", async () => {
    const stub = env.OrgAgent.get(env.OrgAgent.idFromName("ws-bytes"));
    const bytes = new Uint8Array([0, 1, 2, 3, 250, 255]);
    const read = await runInDurableObject(stub, async (o: OrgAgent) => {
      await o.writeFileBytes(
        "/shared/blob.bin",
        bytes,
        "application/octet-stream"
      );
      return o.readFileBytes("/shared/blob.bin");
    });
    expect(read).not.toBeNull();
    expect(Array.from(read as Uint8Array)).toEqual(Array.from(bytes));
  });

  it("broadcasts a workspace-change signal on write (onChange → broadcast)", async () => {
    const stub = env.OrgAgent.get(env.OrgAgent.idFromName("ws-onchange"));
    const captured = await runInDurableObject(stub, async (o: OrgAgent) => {
      const messages: string[] = [];
      // Capture what the workspace onChange hook fans out to connected clients.
      o.broadcast = ((msg: string) => {
        messages.push(msg);
      }) as OrgAgent["broadcast"];
      await o.writeFile("/watched.txt", "x");
      return messages;
    });

    const events = captured
      .map((m) => JSON.parse(m) as { type: string; event?: { path: string } })
      .filter((m) => m.type === "workspace-change");
    expect(events.length).toBeGreaterThan(0);
    expect(events.some((e) => e.event?.path === "/watched.txt")).toBe(true);
  });
});
