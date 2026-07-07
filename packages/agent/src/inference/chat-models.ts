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

// Compaction must scale to the model's context window — a 200k-window model
// can't spend a 750k budget, and a 1M-window model shouldn't compact at 96k.
// Windows are keyed by gateway model id; unknown ids fall back to a
// conservative floor so we compact *earlier*, never later, than is safe.
// Update this table when a new chat model is adopted.
const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  "google/gemini-3-flash": 1_000_000,
};

// Conservative window for an unrecognized model id. Sized to the smallest
// mainstream window so the derived budget never overruns an unknown model.
const DEFAULT_CONTEXT_WINDOW = 128_000;

// Compact when input tokens reach this fraction of the model's window, leaving
// headroom for the response plus the next user turn before the hard ceiling.
const COMPACTION_FRACTION = 0.75;

export function getOrgChatModelId(): string {
  return ORG_CHAT_MODEL_ID;
}

export function resolveOrgChatModel(): LanguageModel {
  return gateway(ORG_CHAT_MODEL_ID);
}

/** The model's total context window (tokens), by gateway model id. */
export function getModelContextWindow(modelId: string): number {
  return MODEL_CONTEXT_WINDOWS[modelId] ?? DEFAULT_CONTEXT_WINDOW;
}

/**
 * Token budget above which the chat history should be compacted, derived from
 * the *given model's* context window. Both the pre-turn heuristic backstop
 * (`compactAfter`) and the post-turn real-usage trigger use this so they agree.
 */
export function getCompactionLimit(modelId: string): number {
  return Math.floor(getModelContextWindow(modelId) * COMPACTION_FRACTION);
}
