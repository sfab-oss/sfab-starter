import type { chats, messages } from "../schema/chat";

export type DBChat = typeof chats.$inferSelect;
export type DBMessage = typeof messages.$inferSelect;
