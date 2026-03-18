import { db } from "@workspace/db-d1";
import { chats, messages } from "@workspace/db-d1/schema/chat";
import type {
  BaseAIUIMessage,
  ChatProcessingStatus,
} from "@workspace/types/ai";
import { and, asc, desc, eq, gte, isNull } from "drizzle-orm";

export function dbMessageToAIMessage(
  message: typeof messages.$inferSelect
): BaseAIUIMessage {
  return {
    id: message.id,
    role: message.role as BaseAIUIMessage["role"],
    parts: message.parts as BaseAIUIMessage["parts"],
    metadata: message.metadata as BaseAIUIMessage["metadata"],
  };
}

export function dbMessagesToAIMessages(
  msgs: (typeof messages.$inferSelect)[]
): BaseAIUIMessage[] {
  return msgs.map(dbMessageToAIMessage);
}

export async function createChat({
  id,
  userId,
  organizationId,
  title,
  message,
  parentChatId,
  parentToolCallId,
}: {
  id: string;
  userId: string;
  organizationId: string;
  title: string;
  message: BaseAIUIMessage;
  parentChatId?: string;
  parentToolCallId?: string;
}): Promise<string> {
  const [result] = await db
    .insert(chats)
    .values({
      id,
      userId,
      organizationId,
      title,
      parentChatId,
      parentToolCallId,
    })
    .returning();
  if (!result) {
    throw new Error("Failed to create chat");
  }
  await db.insert(messages).values({
    id: message.id,
    userId,
    chatId: result.id,
    role: message.role,
    parts: message.parts,
    metadata: message.metadata ?? {
      createdAt: new Date().toISOString(),
      status: "success",
    },
  });
  return result.id;
}

export async function getChatMessages(
  chatId: string
): Promise<BaseAIUIMessage[] | null> {
  const chat = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
  });

  if (!chat) {
    return null;
  }
  const result = await db.query.messages.findMany({
    where: eq(messages.chatId, chatId),
    orderBy: messages.id,
  });
  return dbMessagesToAIMessages(result);
}

export async function getChat(
  chatId: string
): Promise<typeof chats.$inferSelect | null> {
  const result = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
  });
  if (!result) {
    return null;
  }
  return result;
}

export async function getChats(
  userId: string,
  organizationId: string,
  options?: { sort?: "asc" | "desc" }
): Promise<(typeof chats.$inferSelect)[]> {
  const { sort = "desc" } = options || {};
  const orderBy = sort === "asc" ? asc(chats.createdAt) : desc(chats.createdAt);
  const result = await db.query.chats.findMany({
    where: and(
      eq(chats.userId, userId),
      eq(chats.organizationId, organizationId),
      isNull(chats.parentChatId)
    ),
    orderBy,
  });
  return result;
}

export async function addMessageToChat({
  chatId,
  message,
  userId,
}: {
  chatId: string;
  message: BaseAIUIMessage;
  userId: string;
}): Promise<void> {
  await db.insert(messages).values({
    id: message.id,
    chatId,
    userId,
    role: message.role,
    parts: message.parts,
    metadata: message.metadata,
  });
}

export async function upsertMessageToChat({
  chatId,
  message,
  userId,
}: {
  chatId: string;
  message: BaseAIUIMessage;
  userId: string;
}): Promise<void> {
  const metadata = message.metadata ?? {
    createdAt: new Date().toISOString(),
    status: "success",
  };

  const existing = await db.query.messages.findFirst({
    where: eq(messages.id, message.id),
  });

  if (existing) {
    await db
      .update(messages)
      .set({
        role: message.role,
        parts: message.parts,
        metadata,
      })
      .where(eq(messages.id, message.id));
  } else {
    await db.insert(messages).values({
      id: message.id,
      chatId,
      userId,
      role: message.role,
      parts: message.parts,
      metadata,
    });
  }
}

export async function deleteMessagesFromPoint({
  chatId,
  messageId,
  userId,
}: {
  chatId: string;
  messageId: string;
  userId: string;
}): Promise<void> {
  const targetMessage = await db.query.messages.findFirst({
    where: and(
      eq(messages.id, messageId),
      eq(messages.chatId, chatId),
      eq(messages.userId, userId)
    ),
  });

  if (!targetMessage) {
    return;
  }

  // ULID IDs are lexicographically sortable by creation time,
  // so gte on id correctly captures this and all later messages.
  await db
    .delete(messages)
    .where(
      and(
        eq(messages.chatId, chatId),
        eq(messages.userId, userId),
        gte(messages.id, targetMessage.id)
      )
    );
}

export async function updateChatStatus(
  chatId: string,
  status: ChatProcessingStatus,
  lastError?: string
): Promise<void> {
  await db
    .update(chats)
    .set({
      status,
      lastError: lastError ?? null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(chats.id, chatId));
}

export async function getChatStatus(chatId: string) {
  const result = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
    columns: { status: true, lastError: true },
  });
  return result ?? null;
}

export async function deleteChat({
  chatId,
  userId,
}: {
  chatId: string;
  userId: string;
}): Promise<void> {
  await db
    .delete(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)));
}

export function getChildChats(
  parentChatId: string
): Promise<(typeof chats.$inferSelect)[]> {
  return db.query.chats.findMany({
    where: eq(chats.parentChatId, parentChatId),
    orderBy: asc(chats.createdAt),
  });
}

export async function getChildChatByToolCallId(
  parentToolCallId: string
): Promise<typeof chats.$inferSelect | null> {
  const result = await db.query.chats.findFirst({
    where: eq(chats.parentToolCallId, parentToolCallId),
  });
  return result ?? null;
}

export async function getLastAssistantMessage(
  chatId: string
): Promise<string | null> {
  const result = await db.query.messages.findMany({
    where: eq(messages.chatId, chatId),
    orderBy: messages.id,
  });
  const assistantMessages = result.filter((m) => m.role === "assistant");
  const lastMessage = assistantMessages.at(-1);
  if (!lastMessage) {
    return null;
  }
  const parts = lastMessage.parts as BaseAIUIMessage["parts"];
  const textParts = parts.filter((p) => p.type === "text").map((p) => p.text);
  return textParts.join("\n") || null;
}
