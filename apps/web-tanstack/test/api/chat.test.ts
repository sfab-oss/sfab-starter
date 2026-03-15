import { SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { createTestSession, createTestSessionWithOrg } from "../helpers/auth";

const API = "http://localhost/api/protected/chat";

let cookie: string;
let userId: string;
let orgId: string;

beforeEach(async () => {
  const session = await createTestSessionWithOrg();
  cookie = session.cookie;
  userId = session.userId;

  // Get the active orgId from the session
  const meRes = await SELF.fetch("http://localhost/api/protected/me", {
    headers: { Cookie: cookie },
  });
  const me = (await meRes.json()) as {
    session: { activeOrganizationId: string };
  };
  orgId = me.session.activeOrganizationId;
});

// ---------- helpers ----------

const makeMessage = (role: "user" | "assistant", text: string) => ({
  id: crypto.randomUUID(),
  role,
  parts: [{ type: "text" as const, text }],
  metadata: { createdAt: new Date().toISOString(), status: "success" },
});

async function createChatViaDb(
  title: string,
  messageText: string,
  overrides?: { userId?: string; organizationId?: string }
) {
  const { createChat } = await import("@workspace/core/chat");
  const chatId = crypto.randomUUID();
  await createChat({
    id: chatId,
    userId: overrides?.userId ?? userId,
    organizationId: overrides?.organizationId ?? orgId,
    title,
    message: makeMessage("user", messageText),
  });
  return chatId;
}

// ---------- auth checks ----------

describe("auth", () => {
  it("returns 401 without session cookie", async () => {
    const res = await SELF.fetch(API);
    expect(res.status).toBe(401);
  });

  it("returns 401 for chat detail without session", async () => {
    const res = await SELF.fetch(`${API}/some-chat-id`);
    expect(res.status).toBe(401);
  });

  it("returns 403 without an active organization", async () => {
    const sessionNoOrg = await createTestSession();
    const res = await SELF.fetch(API, {
      headers: { Cookie: sessionNoOrg.cookie },
    });
    expect(res.status).toBe(403);
  });
});

// ---------- GET / (list chats) ----------

describe("GET /chat", () => {
  it("returns empty list when no chats exist", async () => {
    const res = await SELF.fetch(API, {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as unknown[];
    expect(data).toEqual([]);
  });

  it("returns chats for the authenticated user", async () => {
    await createChatViaDb("Chat 1", "Hello");
    await createChatViaDb("Chat 2", "Hi");

    const res = await SELF.fetch(API, {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { title: string }[];
    expect(data).toHaveLength(2);
  });

  it("does not return chats from other users", async () => {
    await createChatViaDb("My Chat", "Hello");

    // Create a chat for a different user in a different org
    const otherSession = await createTestSessionWithOrg();
    const otherMeRes = await SELF.fetch("http://localhost/api/protected/me", {
      headers: { Cookie: otherSession.cookie },
    });
    const otherMe = (await otherMeRes.json()) as {
      session: { activeOrganizationId: string };
    };
    await createChatViaDb("Other Chat", "Hi", {
      userId: otherSession.userId,
      organizationId: otherMe.session.activeOrganizationId,
    });

    const res = await SELF.fetch(API, {
      headers: { Cookie: cookie },
    });
    const data = (await res.json()) as { title: string }[];
    expect(data).toHaveLength(1);
    expect(data[0].title).toBe("My Chat");
  });

  it("does not return chats from another organization for the same user", async () => {
    await createChatViaDb("Org A Chat", "Hello");

    // Create a chat in a different org for the same user
    await createChatViaDb("Org B Chat", "Hi", {
      organizationId: "other-org-id",
    });

    const res = await SELF.fetch(API, {
      headers: { Cookie: cookie },
    });
    const data = (await res.json()) as { title: string }[];
    expect(data).toHaveLength(1);
    expect(data[0].title).toBe("Org A Chat");
  });
});

// ---------- GET /:chatId ----------

describe("GET /chat/:chatId", () => {
  it("returns chat with messages", async () => {
    const chatId = await createChatViaDb("Test Chat", "Hello world");

    const res = await SELF.fetch(`${API}/${chatId}`, {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);

    const data = (await res.json()) as {
      id: string;
      title: string;
      messages: { role: string }[];
    };
    expect(data.id).toBe(chatId);
    expect(data.title).toBe("Test Chat");
    expect(data.messages).toHaveLength(1);
    expect(data.messages[0].role).toBe("user");
  });

  it("returns 404 for non-existent chat", async () => {
    const res = await SELF.fetch(`${API}/non-existent-id`, {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(404);
  });

  it("returns 401 when accessing another user's chat", async () => {
    const otherSession = await createTestSessionWithOrg();
    const otherMeRes = await SELF.fetch("http://localhost/api/protected/me", {
      headers: { Cookie: otherSession.cookie },
    });
    const otherMe = (await otherMeRes.json()) as {
      session: { activeOrganizationId: string };
    };
    const chatId = await createChatViaDb("Private Chat", "Secret", {
      userId: otherSession.userId,
      organizationId: otherMe.session.activeOrganizationId,
    });

    const res = await SELF.fetch(`${API}/${chatId}`, {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(401);
  });
});
