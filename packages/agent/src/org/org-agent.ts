import {
  type FileInfo,
  Workspace,
  type WorkspaceChangeEvent,
} from "@cloudflare/shell";
import { Agent, callable } from "agents";
import type { ChatSummary, OrgMemorySnapshot } from "../types";
import { OrgChat } from "./chat";

interface ChatRow {
  created_at: number;
  id: string;
  title: string;
  updated_at: number;
}

export class OrgAgent extends Agent<Cloudflare.Env> {
  workspace = new Workspace({
    sql: this.ctx.storage.sql,
    name: () => this.name,
    onChange: (event) => this.broadcastWorkspaceChange(event),
  });

  override onStart(): void {
    this.sql`CREATE TABLE IF NOT EXISTS chat_meta (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`;

    this.sql`CREATE TABLE IF NOT EXISTS org_memory (
      label TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )`;
  }

  override onBeforeSubAgent(
    _req: Request,
    { className, name }: { className: string; name: string }
  ): Promise<Response | undefined> {
    // Existence is registry-owned: a chat exists iff it is a registered
    // sub-agent (spawned by `createChat`). Gate unknown facets with a 404 —
    // this hook never creates. Mirrors the examples/assistant reference; the
    // client creates a chat explicitly before connecting to its facet.
    if (!this.hasSubAgent(className, name)) {
      return Promise.resolve(
        new Response(`${className} "${name}" not found`, { status: 404 })
      );
    }
    return Promise.resolve(undefined);
  }

  private broadcastWorkspaceChange(event: WorkspaceChangeEvent): void {
    // Fan a lightweight file-change signal to every client connected to this
    // OrgAgent (all chat tabs) so a workspace-backed UI can refresh live across
    // chats/tabs. Best-effort `broadcast` (not `setState`) — file churn should
    // not trigger heavier state re-broadcasts. Does not notify sibling facets.
    this.broadcast(JSON.stringify({ type: "workspace-change", event }));
  }

  touchChat(chatId: string): Promise<void> {
    this
      .sql`UPDATE chat_meta SET updated_at = ${Date.now()} WHERE id = ${chatId}`;
    return Promise.resolve();
  }

  readOrgMemory(label: string): Promise<string | null> {
    const rows = this.sql<{ content: string }>`
      SELECT content FROM org_memory WHERE label = ${label}`;
    return Promise.resolve(rows[0]?.content ?? null);
  }

  writeOrgMemory(label: string, content: string): Promise<void> {
    this.sql`INSERT INTO org_memory (label, content, updated_at)
      VALUES (${label}, ${content}, ${Date.now()})
      ON CONFLICT(label) DO UPDATE SET
        content = excluded.content,
        updated_at = excluded.updated_at`;
    return Promise.resolve();
  }

  @callable()
  getOrgMemory(label = "org_memory"): OrgMemorySnapshot {
    const rows = this.sql<{ content: string; updated_at: number }>`
      SELECT content, updated_at FROM org_memory WHERE label = ${label}`;
    const row = rows[0];
    return {
      content: row?.content ?? null,
      updatedAt: row?.updated_at ?? null,
    };
  }

  @callable()
  listChats(): ChatSummary[] {
    const registry = this.listSubAgents(OrgChat);
    const metaRows = this.sql<ChatRow>`
      SELECT id, title, created_at, updated_at FROM chat_meta`;
    const metaById = new Map(metaRows.map((row) => [row.id, row]));

    return registry
      .map((entry) => {
        const meta = metaById.get(entry.name);
        const createdAt = meta?.created_at ?? entry.createdAt;
        return {
          id: entry.name,
          title: meta?.title ?? defaultChatTitle(createdAt),
          createdAt,
          updatedAt: meta?.updated_at ?? createdAt,
        };
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  @callable()
  async createChat(opts?: { title?: string }): Promise<ChatSummary> {
    const id = generateChatId();
    const now = Date.now();
    const title = opts?.title?.trim() || defaultChatTitle(now);

    await this.subAgent(OrgChat, id);
    this.sql`INSERT INTO chat_meta (id, title, created_at, updated_at)
      VALUES (${id}, ${title}, ${now}, ${now})`;

    return { id, title, createdAt: now, updatedAt: now };
  }

  @callable()
  renameChat(id: string, title: string): Promise<void> {
    const trimmed = title.trim();
    if (!trimmed) {
      return Promise.resolve();
    }
    this.sql`INSERT INTO chat_meta (id, title, created_at, updated_at)
      VALUES (${id}, ${trimmed}, ${Date.now()}, ${Date.now()})
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        updated_at = excluded.updated_at`;
    return Promise.resolve();
  }

  @callable()
  async deleteChat(id: string): Promise<void> {
    // Registry is authoritative: drop the facet first, then its decoration row.
    // No re-seed — an org with zero chats is a valid state; the client creates
    // the next chat on demand (draft → createChat).
    await this.deleteSubAgent(OrgChat, id);
    this.sql`DELETE FROM chat_meta WHERE id = ${id}`;
  }

  // The generic fs methods below are internal (used by codemode tools + the
  // SharedWorkspace proxy) and intentionally NOT `@callable()`. These two thin
  // wrappers are the only workspace methods the browser can reach: read-only,
  // org-gated (the `/agents/org-agent/:id` route is scoped to the caller's
  // active org), and returning already-serializable values.

  @callable()
  listWorkspace(path = "/"): Promise<FileInfo[]> {
    return this.workspace.readDir(path);
  }

  @callable()
  readWorkspaceFile(path: string): Promise<string | null> {
    return this.workspace.readFile(path);
  }

  readFile(path: string) {
    return this.workspace.readFile(path);
  }

  readFileBytes(path: string) {
    return this.workspace.readFileBytes(path);
  }

  writeFile(
    path: string,
    content: string,
    mimeType?: Parameters<Workspace["writeFile"]>[2]
  ) {
    return this.workspace.writeFile(path, content, mimeType);
  }

  writeFileBytes(
    path: string,
    content: Parameters<Workspace["writeFileBytes"]>[1],
    mimeType?: Parameters<Workspace["writeFileBytes"]>[2]
  ) {
    return this.workspace.writeFileBytes(path, content, mimeType);
  }

  appendFile(
    path: string,
    content: string,
    mimeType?: Parameters<Workspace["appendFile"]>[2]
  ) {
    return this.workspace.appendFile(path, content, mimeType);
  }

  exists(path: string) {
    return this.workspace.exists(path);
  }

  readDir(path: string, opts?: Parameters<Workspace["readDir"]>[1]) {
    return this.workspace.readDir(path, opts);
  }

  rm(path: string, opts?: Parameters<Workspace["rm"]>[1]) {
    return this.workspace.rm(path, opts);
  }

  glob(pattern: string) {
    return this.workspace.glob(pattern);
  }

  mkdir(path: string, opts?: Parameters<Workspace["mkdir"]>[1]) {
    return this.workspace.mkdir(path, opts);
  }

  stat(path: string) {
    return this.workspace.stat(path);
  }

  lstat(path: string) {
    return this.workspace.lstat(path);
  }

  cp(src: string, dest: string, opts?: Parameters<Workspace["cp"]>[2]) {
    return this.workspace.cp(src, dest, opts);
  }

  mv(src: string, dest: string) {
    return this.workspace.mv(src, dest);
  }

  symlink(target: string, linkPath: string) {
    return this.workspace.symlink(target, linkPath);
  }

  readlink(path: string) {
    return this.workspace.readlink(path);
  }
}

function generateChatId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function defaultChatTitle(timestamp: number): string {
  return `Chat ${new Date(timestamp).toISOString().slice(0, 16).replace("T", " ")}`;
}
