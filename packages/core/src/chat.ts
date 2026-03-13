import { db } from "@workspace/db-d1";
import { chats, messages } from "@workspace/db-d1/schema/chat";
import type { BaseAIUIMessage } from "@workspace/types/ai";
import { and, asc, desc, eq, gte } from "drizzle-orm";

export function dbMessageToAIMessage(
  message: typeof messages.$inferSelect
): BaseAIUIMessage {
  return {
    id: message.id,
    role: message.role,
    parts: message.parts,
    metadata: message.metadata,
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
  title,
  message,
}: {
  id: string;
  userId: string;
  title: string;
  message: BaseAIUIMessage;
}): Promise<string> {
  const [result] = await db
    .insert(chats)
    .values({ id, userId, title })
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
    orderBy: messages.createdAt,
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
  options?: { sort?: "asc" | "desc" }
): Promise<(typeof chats.$inferSelect)[]> {
  const { sort = "desc" } = options || {};
  const orderBy = sort === "asc" ? asc(chats.createdAt) : desc(chats.createdAt);
  const result = await db.query.chats.findMany({
    where: eq(chats.userId, userId),
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

  await db
    .delete(messages)
    .where(
      and(
        eq(messages.chatId, chatId),
        eq(messages.userId, userId),
        gte(messages.createdAt, targetMessage.createdAt)
      )
    );
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
