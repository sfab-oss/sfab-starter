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
import { isAgentId } from "../../lib/ai/agents";
import { agentRespond } from "../../lib/ai/respond";
import { generateChatTitle } from "../../lib/ai/title-generator";
import type { AIUIMessage } from "../../types/ai";
import type { HonoContextWithAuthAndOrg } from "../types";

const DEFAULT_AGENT_ID = "general-agent";

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
      const orgId = c.get("session").activeOrganizationId;
      const chats = await getChats(userId, orgId, { sort });
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
    const { newMessage, chatId, context, trigger, messageId, agentId } =
      (await c.req.json()) as {
        newMessage: AIUIMessage;
        chatId: string;
        context: ChatContext;
        trigger?: "submit-message" | "regenerate-message";
        messageId?: string;
        agentId?: string;
      };
    const resolvedAgentId =
      agentId && isAgentId(agentId) ? agentId : DEFAULT_AGENT_ID;
    const abortSignal = c.req.raw.signal;

    const userId = c.get("user").id;
    const orgId = c.get("session").activeOrganizationId;

    const savedChat = await getChat(chatId);

    if (!savedChat) {
      const messageFirstPartText = newMessage.parts.find(
        (p) => p.type === "text"
      );

      const title = await generateChatTitle(messageFirstPartText?.text ?? "");
      const newChatId = await createChat({
        id: chatId,
        userId,
        organizationId: orgId,
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
        orgId,
        agentId: resolvedAgentId,
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

    return agentRespond({
      messages: messagesToProcess as AIUIMessage[],
      onUpsertMessage: async (message) => {
        await upsertMessageToChat({
          userId,
          chatId,
          message,
        });
      },
      abortSignal,
      orgId,
      agentId: resolvedAgentId,
      context,
    });
  });

export default chatRoutes;
