import { db } from "@workspace/db/client";
import { dbMessagesToAIMessages } from "@workspace/db/lib/chat-utils";
import { chats, messages } from "@workspace/db/schema/chat";
import type { BaseAIUIMessage } from "@workspace/types/ai";
import { and, asc, desc, eq, gte } from "drizzle-orm";

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
  return await db.transaction(async (tx) => {
    const [result] = await tx
      .insert(chats)
      .values({ id, userId, title })
      .returning();
    if (!result) {
      throw new Error("Failed to create chat");
    }
    await tx.insert(messages).values({
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
  });
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
  console.log("upsertMessageToChat", chatId, message.id, userId);
  const metadata = message.metadata ?? {
    createdAt: new Date().toISOString(),
    status: "success",
  };
  await db
    .insert(messages)
    .values({
      id: message.id,
      chatId,
      userId,
      role: message.role,
      parts: message.parts,
      metadata,
    })
    .onConflictDoUpdate({
      target: messages.id,
      set: {
        role: message.role,
        parts: message.parts,
        metadata,
      },
    });
}

/**
 * Deletes a message and all messages that came after it in the chat.
 * Used for regenerating assistant responses.
 *
 * @param chatId - The chat containing the messages
 * @param messageId - The ID of the message to delete from (inclusive)
 * @param userId - The user who owns the chat (for authorization)
 *
 * @example
 * // User wants to regenerate response after msg_003
 * // This deletes msg_003 and all messages after it
 * await deleteMessagesFromPoint({
 *   chatId: "chat_abc",
 *   messageId: "msg_003",
 *   userId: "user_123"
 * });
 */
export async function deleteMessagesFromPoint({
  chatId,
  messageId,
  userId,
}: {
  chatId: string;
  messageId: string;
  userId: string;
}): Promise<void> {
  // First, find the target message to get its timestamp
  const targetMessage = await db.query.messages.findFirst({
    where: and(
      eq(messages.id, messageId),
      eq(messages.chatId, chatId),
      eq(messages.userId, userId)
    ),
  });

  // If message doesn't exist, it may have already been deleted
  // This makes the operation idempotent (safe to call multiple times)
  if (!targetMessage) {
    return;
  }

  // Delete the target message and all messages created at or after it
  // Using createdAt ensures we catch any messages that might have been
  // created at the exact same timestamp (e.g., rapid tool calls)
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
