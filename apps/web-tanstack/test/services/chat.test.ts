import { beforeEach, describe, expect, it } from "vitest";
import { seedUser } from "../helpers/seed";

let userId: string;

const makeMessage = (
  role: "user" | "assistant",
  text: string
): {
  id: string;
  role: "user" | "assistant";
  parts: { type: "text"; text: string }[];
  metadata: { createdAt: string; status: string };
} => ({
  id: crypto.randomUUID(),
  role,
  parts: [{ type: "text", text }],
  metadata: { createdAt: new Date().toISOString(), status: "success" },
});

beforeEach(async () => {
  const user = await seedUser();
  userId = user.id;
});

describe("createChat", () => {
  it("creates a chat with an initial message", async () => {
    const { createChat, getChat, getChatMessages } = await import(
      "@workspace/core/chat"
    );
    const chatId = await createChat({
      id: crypto.randomUUID(),
      userId,
      title: "Test Chat",
      message: makeMessage("user", "Hello"),
    });

    const chat = await getChat(chatId);
    expect(chat).toBeDefined();
    expect(chat?.title).toBe("Test Chat");

    const messages = await getChatMessages(chatId);
    expect(messages).toHaveLength(1);
    expect(messages?.[0].role).toBe("user");
  });
});

describe("getChats", () => {
  it("returns chats for a user", async () => {
    const { createChat, getChats } = await import("@workspace/core/chat");

    await createChat({
      id: crypto.randomUUID(),
      userId,
      title: "First Chat",
      message: makeMessage("user", "First"),
    });

    await createChat({
      id: crypto.randomUUID(),
      userId,
      title: "Second Chat",
      message: makeMessage("user", "Second"),
    });

    const chats = await getChats(userId);
    expect(chats).toHaveLength(2);
  });

  it("does not return chats from other users", async () => {
    const otherUser = await seedUser();
    const { createChat, getChats } = await import("@workspace/core/chat");

    await createChat({
      id: crypto.randomUUID(),
      userId,
      title: "My Chat",
      message: makeMessage("user", "Hello"),
    });

    await createChat({
      id: crypto.randomUUID(),
      userId: otherUser.id,
      title: "Other Chat",
      message: makeMessage("user", "Hello"),
    });

    const chats = await getChats(userId);
    expect(chats).toHaveLength(1);
    expect(chats[0].title).toBe("My Chat");
  });
});

describe("addMessageToChat", () => {
  it("adds a message to an existing chat", async () => {
    const { createChat, addMessageToChat, getChatMessages } = await import(
      "@workspace/core/chat"
    );

    const chatId = await createChat({
      id: crypto.randomUUID(),
      userId,
      title: "Chat",
      message: makeMessage("user", "Hello"),
    });

    await addMessageToChat({
      chatId,
      userId,
      message: makeMessage("assistant", "Hi there!"),
    });

    const messages = await getChatMessages(chatId);
    expect(messages).toHaveLength(2);
    expect(messages?.[1].role).toBe("assistant");
  });
});

describe("upsertMessageToChat", () => {
  it("inserts a new message", async () => {
    const { createChat, upsertMessageToChat, getChatMessages } = await import(
      "@workspace/core/chat"
    );

    const chatId = await createChat({
      id: crypto.randomUUID(),
      userId,
      title: "Chat",
      message: makeMessage("user", "Hello"),
    });

    await upsertMessageToChat({
      chatId,
      userId,
      message: makeMessage("assistant", "Response"),
    });

    const messages = await getChatMessages(chatId);
    expect(messages).toHaveLength(2);
  });

  it("updates an existing message", async () => {
    const { createChat, upsertMessageToChat, getChatMessages } = await import(
      "@workspace/core/chat"
    );

    const msg = makeMessage("assistant", "Original");
    const chatId = await createChat({
      id: crypto.randomUUID(),
      userId,
      title: "Chat",
      message: msg,
    });

    await upsertMessageToChat({
      chatId,
      userId,
      message: { ...msg, parts: [{ type: "text", text: "Updated" }] },
    });

    const messages = await getChatMessages(chatId);
    expect(messages).toHaveLength(1);
    expect(messages?.[0].parts).toEqual([{ type: "text", text: "Updated" }]);
  });
});

describe("deleteChat", () => {
  it("deletes a chat", async () => {
    const { createChat, deleteChat, getChat } = await import(
      "@workspace/core/chat"
    );

    const chatId = await createChat({
      id: crypto.randomUUID(),
      userId,
      title: "To Delete",
      message: makeMessage("user", "Hello"),
    });

    await deleteChat({ chatId, userId });
    const chat = await getChat(chatId);
    expect(chat).toBeNull();
  });

  it("does not delete another user's chat", async () => {
    const otherUser = await seedUser();
    const { createChat, deleteChat, getChat } = await import(
      "@workspace/core/chat"
    );

    const chatId = await createChat({
      id: crypto.randomUUID(),
      userId: otherUser.id,
      title: "Other Chat",
      message: makeMessage("user", "Hello"),
    });

    await deleteChat({ chatId, userId });
    const chat = await getChat(chatId);
    expect(chat).not.toBeNull();
  });
});

describe("deleteMessagesFromPoint", () => {
  it("deletes the target message and all after it", async () => {
    const {
      createChat,
      addMessageToChat,
      deleteMessagesFromPoint,
      getChatMessages,
    } = await import("@workspace/core/chat");

    const chatId = await createChat({
      id: crypto.randomUUID(),
      userId,
      title: "Chat",
      message: makeMessage("user", "First"),
    });

    const secondMsg = makeMessage("assistant", "Second");
    await addMessageToChat({ chatId, userId, message: secondMsg });

    const thirdMsg = makeMessage("user", "Third");
    await addMessageToChat({ chatId, userId, message: thirdMsg });

    // Delete from the second message onwards
    await deleteMessagesFromPoint({
      chatId,
      messageId: secondMsg.id,
      userId,
    });

    const remaining = await getChatMessages(chatId);
    expect(remaining).toHaveLength(1);
    expect(remaining?.[0].parts).toEqual([{ type: "text", text: "First" }]);
  });

  it("does nothing when messageId does not exist", async () => {
    const {
      createChat,
      addMessageToChat,
      deleteMessagesFromPoint,
      getChatMessages,
    } = await import("@workspace/core/chat");

    const chatId = await createChat({
      id: crypto.randomUUID(),
      userId,
      title: "Chat",
      message: makeMessage("user", "Hello"),
    });

    await addMessageToChat({
      chatId,
      userId,
      message: makeMessage("assistant", "Response"),
    });

    await deleteMessagesFromPoint({
      chatId,
      messageId: "non-existent-id",
      userId,
    });

    const messages = await getChatMessages(chatId);
    expect(messages).toHaveLength(2);
  });

  it("does not delete messages from another user's chat", async () => {
    const otherUser = await seedUser();
    const {
      createChat,
      addMessageToChat,
      deleteMessagesFromPoint,
      getChatMessages,
    } = await import("@workspace/core/chat");

    const msg = makeMessage("user", "Hello");
    const chatId = await createChat({
      id: crypto.randomUUID(),
      userId: otherUser.id,
      title: "Other Chat",
      message: msg,
    });

    await addMessageToChat({
      chatId,
      userId: otherUser.id,
      message: makeMessage("assistant", "Response"),
    });

    // Try to delete as wrong user
    await deleteMessagesFromPoint({
      chatId,
      messageId: msg.id,
      userId,
    });

    const messages = await getChatMessages(chatId);
    expect(messages).toHaveLength(2);
  });
});
