import { Workspace } from "@cloudflare/shell";
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

  override async onBeforeSubAgent(
    _req: Request,
    { className, name }: { className: string; name: string }
  ): Promise<Request | Response | undefined> {
    if (this.hasSubAgent(className, name)) {
      return undefined;
    }
    if (className === OrgChat.name && name === "default") {
      const now = Date.now();
      await this.subAgent(OrgChat, "default");
      this
        .sql`INSERT OR IGNORE INTO chat_meta (id, title, created_at, updated_at)
        VALUES ('default', 'Default chat', ${now}, ${now})`;
      return undefined;
    }
    return new Response(`${className} "${name}" not found`, { status: 404 });
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
    await this.deleteSubAgent(OrgChat, id);
    this.sql`DELETE FROM chat_meta WHERE id = ${id}`;

    if (this.listSubAgents(OrgChat).length === 0) {
      const now = Date.now();
      await this.subAgent(OrgChat, "default");
      this
        .sql`INSERT OR IGNORE INTO chat_meta (id, title, created_at, updated_at)
        VALUES ('default', 'Default chat', ${now}, ${now})`;
    }
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
