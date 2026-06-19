import { gateway, type LanguageModel } from "ai";

const ORG_CHAT_MODEL_ID = "google/gemini-3-flash";
const MAX_CONTEXT_TOKENS = 1_000_000;
const COMPACTION_FRACTION = 0.75;

export function getOrgChatModelId(): string {
  return ORG_CHAT_MODEL_ID;
}

export function resolveOrgChatModel(): LanguageModel {
  return gateway(ORG_CHAT_MODEL_ID);
}

export function getCompactionLimit(): number {
  return Math.floor(MAX_CONTEXT_TOKENS * COMPACTION_FRACTION);
}

export function getMaxContextTokens(): number {
  return MAX_CONTEXT_TOKENS;
}
