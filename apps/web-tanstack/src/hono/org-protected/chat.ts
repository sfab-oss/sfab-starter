import { zValidator } from "@hono/zod-validator";
import {
  createChat,
  deleteMessagesFromPoint,
  getChat,
  getChatMessages,
  getChatStatus,
  getChats,
  updateChatStatus,
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
import { safeWaitUntil } from "../utils/wait-until";

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
  .post("/:chatId/cancel", async (c) => {
    const chatId = c.req.param("chatId");
    const userId = c.get("user").id;
    const chat = await getChat(chatId);

    if (!chat) {
      return c.json({ error: "Chat not found" }, 404);
    }
    if (chat.userId !== userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    if (chat.status !== "processing") {
      return c.json({ error: "Chat is not processing" }, 409);
    }

    await updateChatStatus(chatId, "idle");
    return c.json({ success: true });
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

    const userId = c.get("user").id;
    const orgId = c.get("session").activeOrganizationId;

    // Guard: reject if chat is already processing
    const existingChat = await getChat(chatId);
    if (existingChat?.status === "processing") {
      return c.json({ error: "Chat is already processing" }, 409);
    }

    // Resolve the messages to send to the agent
    let messagesToProcess: AIUIMessage[];

    if (existingChat) {
      if (existingChat.userId !== userId) {
        return c.json({ error: "Unauthorized" }, 401);
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

      const savedMessages = await getChatMessages(chatId);
      if (!savedMessages) {
        return c.json({ error: "Chat messages not found" }, 404);
      }
      messagesToProcess = savedMessages as AIUIMessage[];
    } else {
      const messageFirstPartText = newMessage.parts.find(
        (p) => p.type === "text"
      );

      const title = await generateChatTitle(messageFirstPartText?.text ?? "");
      await createChat({
        id: chatId,
        userId,
        organizationId: orgId,
        title,
        message: newMessage,
      });

      messagesToProcess = [newMessage];
    }

    // Check if cancel was user-initiated to avoid overwriting "idle" with "failed"
    const checkCanceled = async () => {
      const current = await getChatStatus(chatId);
      return current?.status !== "processing";
    };

    await updateChatStatus(chatId, "processing");

    try {
      const { response, completionPromise } = await agentRespond({
        messages: messagesToProcess,
        onUpsertMessage: async (message) => {
          await upsertMessageToChat({ chatId, userId, message });
        },
        orgId,
        agentId: resolvedAgentId,
        context,
        onComplete: async () => {
          await updateChatStatus(chatId, "idle");
        },
        onError: async (error) => {
          // Don't overwrite "idle" from a user-initiated cancel with "failed"
          const current = await getChatStatus(chatId);
          if (current?.status === "processing") {
            const message =
              error instanceof Error ? error.message : "Unknown error";
            await updateChatStatus(chatId, "failed", message);
          }
        },
        checkCanceled,
      });
      safeWaitUntil(completionPromise);
      return response;
    } catch (error) {
      // agentRespond threw before the stream started — reset status
      await updateChatStatus(
        chatId,
        "failed",
        error instanceof Error ? error.message : "Failed to start agent"
      );
      throw error;
    }
  });

export default chatRoutes;
