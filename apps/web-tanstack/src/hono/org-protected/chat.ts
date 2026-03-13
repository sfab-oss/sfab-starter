import { zValidator } from "@hono/zod-validator";
import {
  createChat,
  deleteMessagesFromPoint,
  getChat,
  getChatMessages,
  getChats,
  upsertMessageToChat,
} from "@workspace/core/chat";
import type { ChatContext } from "@workspace/types/ai";
import { Hono } from "hono";
import { z } from "zod";
import { agentRespond } from "../../lib/ai/agents/agent-respond";
import { generateChatTitle } from "../../lib/ai/title-generator";
import type { AIUIMessage } from "../../types/ai";
import type { HonoContextWithAuthAndOrg } from "../types";

const chatRoutes = new Hono<HonoContextWithAuthAndOrg>()
  .get(
    "/",
    zValidator(
      "query",
      z.object({ sort: z.enum(["asc", "desc"]).optional().default("desc") })
    ),
    async (c) => {
      const { sort } = c.req.valid("query");
      const userId = c.get("user").id;
      const chats = await getChats(userId, { sort });
      return c.json(chats);
    }
  )
  .get("/:chatId", async (c) => {
    const chatId = c.req.param("chatId");
    const userId = c.get("user").id;
    const savedChat = await getChat(chatId);

    if (!savedChat) {
      return c.json({ error: "Chat not found" }, 404);
    }

    if (savedChat.userId !== userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const messages = await getChatMessages(chatId);

    if (!messages) {
      return c.json({ error: "Chat messages not found" }, 404);
    }

    return c.json({ ...savedChat, messages });
  })
  .post("/messages", async (c) => {
    const { newMessage, chatId, context, trigger, messageId } =
      (await c.req.json()) as {
        newMessage: AIUIMessage;
        chatId: string;
        context: ChatContext;
        trigger?: "submit-message" | "regenerate-message";
        messageId?: string;
      };
    const abortSignal = c.req.raw.signal;

    const userId = c.get("user").id;

    const savedChat = await getChat(chatId);

    if (!savedChat) {
      const messageFirstPartText = newMessage.parts.find(
        (p) => p.type === "text"
      );

      const title = await generateChatTitle(messageFirstPartText?.text ?? "");
      const newChatId = await createChat({
        id: chatId,
        userId,
        title,
        message: newMessage,
      });
      return agentRespond({
        messages: [newMessage],
        onUpsertMessage: async (message) => {
          await upsertMessageToChat({
            chatId: newChatId,
            userId,
            message,
          });
        },
        abortSignal,
        userId,
        agentId: "general-agent",
        context,
      });
    }

    if (savedChat.userId !== userId) {
      throw new Error("Unauthorized");
    }

    if (trigger === "regenerate-message" && messageId) {
      await deleteMessagesFromPoint({
        chatId,
        messageId,
        userId,
      });
    }

    await upsertMessageToChat({
      userId,
      chatId,
      message: newMessage,
    });

    const messagesToProcess = await getChatMessages(chatId);

    if (!messagesToProcess) {
      throw new Error("Chat messages not found");
    }

    const typedMessages = messagesToProcess as AIUIMessage[];

    return agentRespond({
      messages: typedMessages,
      onUpsertMessage: async (message) => {
        await upsertMessageToChat({
          userId,
          chatId,
          message,
        });
      },
      abortSignal,
      userId,
      agentId: "general-agent",
      context,
    });
  });

export default chatRoutes;
