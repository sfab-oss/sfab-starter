"use client";

import { type ChatStatus, isTextUIPart } from "ai";
import { useCallback, useMemo, useState } from "react";
import type { ChatDockPromptMessage } from "../components/chat-input";
import {
  createMockAssistantReply,
  type GalleryChatMessage,
} from "../lib/mock-chat-messages";
import { MOCK_CHATS, type MockChat } from "../lib/mock-chats";

/** Docked window size for the focused chat: compact popup vs. large file view. */
export type ChatDockSize = "popup" | "expanded";

let draftCount = 0;
let replyCount = 0;

function newDraftChat(): MockChat {
  draftCount += 1;
  return {
    id: crypto.randomUUID(),
    title: `New chat ${draftCount}`,
    ageLabel: "now",
    bucket: "today",
    messages: [],
  };
}

/**
 * Mock multi-session dock state, modelled on the app's real chat dock. A chat
 * only earns a footer pill once it has a message: "Ask the assistant" opens an
 * unsent *draft* (focused, but not yet a tab) that is promoted into `chats` +
 * `openIds` on first send. Beyond that it tracks the set of open tabs, the
 * single focused chat, and that panel's size. Everything is in-memory fixtures —
 * the real surface (ALW-401) swaps this for the OrgAgent RPC.
 */
export function useChatDock() {
  const [chats, setChats] = useState<MockChat[]>(MOCK_CHATS);
  const [draft, setDraft] = useState<MockChat | null>(null);
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [size, setSize] = useState<ChatDockSize>("popup");
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );

  const openChats = useMemo(
    () =>
      openIds
        .map((id) => chats.find((chat) => chat.id === id))
        .filter((chat): chat is MockChat => chat !== undefined),
    [openIds, chats]
  );

  const focusedChat = useMemo(() => {
    if (!focusedId) {
      return null;
    }
    if (draft && draft.id === focusedId) {
      return draft;
    }
    return chats.find((chat) => chat.id === focusedId) ?? null;
  }, [focusedId, draft, chats]);

  const isDraftFocused = Boolean(draft && draft.id === focusedId);

  // Focusing any real chat discards an unsent draft — the draft is transient.
  const focusChat = useCallback((id: string) => {
    setDraft(null);
    setOpenIds((current) => [...current.filter((tabId) => tabId !== id), id]);
    setFocusedId(id);
    setSize("popup");
  }, []);

  // "Ask the assistant": reuse the open draft if there is one, else start a
  // fresh unsent draft. No pill appears until the first message is sent. Read
  // `draft` from the closure (not a setState updater) so the fresh draft is
  // created exactly once per click — nesting setState here double-fires it.
  const newChat = useCallback(() => {
    const next = draft ?? newDraftChat();
    setDraft(next);
    setFocusedId(next.id);
    setSize("popup");
  }, [draft]);

  const closeTab = useCallback((id: string) => {
    // Closing the focused draft must also drop the draft itself, otherwise
    // newChat() would reuse the stale draft on the next "Ask the assistant".
    setDraft((current) => (current && current.id === id ? null : current));
    setOpenIds((current) => current.filter((tabId) => tabId !== id));
    setFocusedId((current) => (current === id ? null : current));
  }, []);

  const deleteChat = useCallback((id: string) => {
    setChats((current) => current.filter((chat) => chat.id !== id));
    setOpenIds((current) => current.filter((tabId) => tabId !== id));
    setFocusedId((current) => (current === id ? null : current));
  }, []);

  const renameChat = useCallback((id: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }
    setChats((current) =>
      current.map((chat) =>
        chat.id === id ? { ...chat, title: trimmed } : chat
      )
    );
  }, []);

  // Minimizing discards an unsent draft (it never held a message).
  const minimize = useCallback(() => {
    setDraft(null);
    setFocusedId(null);
  }, []);
  const expand = useCallback(() => setSize("expanded"), []);
  const restore = useCallback(() => setSize("popup"), []);

  const setChatMessages = useCallback(
    (
      id: string,
      updater: (messages: GalleryChatMessage[]) => GalleryChatMessage[]
    ) => {
      setChats((current) =>
        current.map((chat) =>
          chat.id === id ? { ...chat, messages: updater(chat.messages) } : chat
        )
      );
    },
    []
  );

  const sendMessage = useCallback(
    async (id: string, message: ChatDockPromptMessage) => {
      const text = message.text.trim();
      const hasAttachments = Boolean(message.files?.length);
      if (!(text || hasAttachments)) {
        return;
      }

      const body = text || (hasAttachments ? "Sent with attachments" : "");

      const userMessage: GalleryChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        parts: body ? [{ type: "text", text: body }] : [],
      };

      // Promote an unsent draft into a real chat on its first message: it gains
      // a footer pill and joins the history list. Branch on the closed-over
      // `draft` and call each setter once — nesting setState double-fires under
      // StrictMode and would duplicate the promoted chat.
      if (draft && draft.id === id) {
        const promoted: MockChat = { ...draft, messages: [userMessage] };
        setDraft(null);
        setChats((existing) => [promoted, ...existing]);
        setOpenIds((existing) =>
          existing.includes(id) ? existing : [...existing, id]
        );
      } else {
        setChatMessages(id, (messages) => [...messages, userMessage]);
      }
      setStatus("submitted");

      await new Promise((resolve) => setTimeout(resolve, 400));

      replyCount += 1;
      const assistantMessage = createMockAssistantReply(replyCount);
      setStreamingMessageId(assistantMessage.id);
      setChatMessages(id, (messages) => [...messages, assistantMessage]);
      setStatus("streaming");

      await new Promise((resolve) => setTimeout(resolve, 900));

      setStreamingMessageId(null);
      setStatus("ready");
    },
    [draft, setChatMessages]
  );

  const copyConversation = useCallback(
    (id: string) => {
      const chat = chats.find((entry) => entry.id === id);
      if (!chat) {
        return;
      }
      const text = chat.messages
        .map((msg) => {
          const body = msg.parts
            .filter(isTextUIPart)
            .map((part) => part.text)
            .join("\n");
          return `${msg.role}: ${body}`;
        })
        .join("\n\n");
      navigator.clipboard.writeText(text).catch(() => undefined);
    },
    [chats]
  );

  const clearConversation = useCallback(
    (id: string) => {
      setChatMessages(id, () => []);
      setStreamingMessageId(null);
      setStatus("ready");
    },
    [setChatMessages]
  );

  return {
    chats,
    openChats,
    focusedId,
    focusedChat,
    isDraftFocused,
    size,
    status,
    streamingMessageId,
    focusChat,
    newChat,
    closeTab,
    deleteChat,
    renameChat,
    minimize,
    expand,
    restore,
    sendMessage,
    copyConversation,
    clearConversation,
  };
}
