import type { GalleryChatMessage } from "./mock-chat-messages";
import { MOCK_CHAT_MESSAGES } from "./mock-chat-messages";

/** Coarse recency bucket for the history list (mock — no real timestamps). */
export type ChatAgeBucket = "today" | "yesterday" | "week" | "earlier";

export interface MockChat {
  id: string;
  title: string;
  /** Short relative age shown at the row's trailing edge, e.g. "2h", "3d". */
  ageLabel: string;
  bucket: ChatAgeBucket;
  messages: GalleryChatMessage[];
}

function seedThread(prompt: string, answer: string): GalleryChatMessage[] {
  return [
    {
      id: crypto.randomUUID(),
      role: "user",
      parts: [{ type: "text", text: prompt }],
    },
    {
      id: crypto.randomUUID(),
      role: "assistant",
      parts: [{ type: "text", text: answer }],
    },
  ];
}

/** Newest first. The first chat reuses the richer multi-part mock thread. */
export const MOCK_CHATS: MockChat[] = [
  {
    id: "chat-open-balances",
    title: "Open balances due this week",
    ageLabel: "2h",
    bucket: "today",
    messages: MOCK_CHAT_MESSAGES,
  },
  {
    id: "chat-low-stock",
    title: "Low stock at Main DC",
    ageLabel: "5h",
    bucket: "today",
    messages: seedThread(
      "Which SKUs are below reorder at Main DC?",
      "12 SKUs are below their reorder point at Main DC. **CL-1180** is at zero on-hand — want a restock draft?"
    ),
  },
  {
    id: "chat-northside",
    title: "Northside payment history",
    ageLabel: "1d",
    bucket: "yesterday",
    messages: seedThread(
      "Show Northside Distributors' payment history.",
      "Northside has paid 6 of the last 8 invoices on time; two are currently open for **$75,000**."
    ),
  },
  {
    id: "chat-reorder",
    title: "Draft reorder for warehouse supplies",
    ageLabel: "3d",
    bucket: "week",
    messages: seedThread(
      "Draft a reorder for the warehouse supplies below reorder point.",
      "I drafted a purchase order covering 12 SKUs. Review it before I hand it to the buyer."
    ),
  },
  {
    id: "chat-monthly-close",
    title: "Monthly close checklist",
    ageLabel: "2w",
    bucket: "earlier",
    messages: seedThread(
      "What's left on the monthly close?",
      "Three tasks remain: reconcile the clearing account, post depreciation, and review open credit notes."
    ),
  },
];

const BUCKET_ORDER: { bucket: ChatAgeBucket; label: string }[] = [
  { bucket: "today", label: "Today" },
  { bucket: "yesterday", label: "Yesterday" },
  { bucket: "week", label: "This week" },
  { bucket: "earlier", label: "Earlier" },
];

export interface ChatHistorySection {
  label: string;
  chats: MockChat[];
}

/** Group chats into recency sections, preserving newest-first order within each. */
export function groupChatsByAge(chats: MockChat[]): ChatHistorySection[] {
  return BUCKET_ORDER.map(({ bucket, label }) => ({
    label,
    chats: chats.filter((chat) => chat.bucket === bucket),
  })).filter((section) => section.chats.length > 0);
}
