import { m } from "@/paraglide/messages.js";

export function defaultNewChatTitle(): string {
  return m.chat_new();
}

export function defaultChatTitle(): string {
  return m.chat_default_title();
}

export function isGenericChatTitle(title: string): boolean {
  return title === m.chat_new() || title === m.chat_default_title();
}
