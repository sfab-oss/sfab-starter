import { gateway, type LanguageModel } from "ai";

// AC-2 (ALW-398): the org chat model is wired as an explicit `LanguageModel`
// resolved through the AI SDK `gateway()` — multi-provider, and it needs no
// Cloudflare binding. Think 0.12 also offers a bare model-id string via its
// built-in resolver, but that routes third-party slugs through **Cloudflare's**
// AI Gateway and requires an `env.AI` (Workers AI) binding — a new resource.
// Adopting that path is deferred to ALW-312 AC-4 ("integrate Cloudflare AI
// Gateway"), where the binding decision belongs. `Think.resolveModel()` returns
// the explicit model below unchanged, so side inference stays correct either way.
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
