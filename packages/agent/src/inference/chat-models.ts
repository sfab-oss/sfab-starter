import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  createGateway,
  defaultSettingsMiddleware,
  type LanguageModel,
  wrapLanguageModel,
} from "ai";

/**
 * ALW-411 — env-driven provider registry for org-agent inference.
 *
 * The org chat model is selected at runtime from environment variables so the
 * same codebase can route through the Vercel AI Gateway (default), Cloudflare
 * Workers AI, or an OpenAI-compatible subscription (e.g. z.ai GLM) — optionally
 * with **Cloudflare AI Gateway** in front for caching/observability. This
 * mirrors the main sfab platform's provider abstraction (a `Provider` union → a
 * data-only build map → one factory), but sources keys from env vars instead of
 * the D1 `provider_keys` table.
 *
 * The decision (which provider, which model, which URL/key) is a pure function
 * (`resolveOrgChatModelConfig`) so it is directly testable; `resolveOrgChatModel`
 * layers the AI SDK client construction on top.
 *
 * With no new env set, the default is `vercel-gateway` / `google/gemini-3-flash`
 * — byte-identical to the previous hard-wired `gateway()` behaviour.
 */

/**
 * Per-model provider options, derived from the exact shape
 * `defaultSettingsMiddleware` accepts so it stays correct across AI SDK bumps
 * (the `ai` package does not re-export a `ProviderOptions` type in this version).
 */
type ProviderOptions = NonNullable<
  NonNullable<
    Parameters<typeof defaultSettingsMiddleware>[0]["settings"]
  >["providerOptions"]
>;

/**
 * The env fields this module reads. They are optional secrets/config delivered
 * via `.dev.vars` / wrangler secrets, so they are deliberately NOT on the
 * generated `Cloudflare.Env` (which must not be hand-edited); we read them
 * through this optional view.
 */
export interface OrgInferenceEnv {
  /** Which underlying provider to route org-agent inference through. */
  ORG_CHAT_PROVIDER?: string;
  /** Override the model id within the selected provider. */
  ORG_CHAT_MODEL?: string;
  /** Vercel AI Gateway key (default provider). */
  AI_GATEWAY_API_KEY?: string;
  /** z.ai GLM coding-plan key. */
  ZAI_API_KEY?: string;
  /** Cloudflare API token for the Workers AI OpenAI-compatible endpoint. */
  WORKERS_AI_API_TOKEN?: string;
  /** Cloudflare account id (Workers AI direct endpoint + AI Gateway URL). */
  CF_ACCOUNT_ID?: string;
  /** Cloudflare AI Gateway id/slug. Set (with account id + token) to route the
   *  openai-compatible providers through the gateway. */
  CF_AIG_GATEWAY_ID?: string;
  /** Cloudflare AI Gateway auth token (sent as `cf-aig-authorization`). */
  CF_AIG_TOKEN?: string;
}

export type OrgChatProvider =
  | "vercel-gateway"
  | "workers-ai"
  | "zai-coding-plan";

/** Modalities a model accepts on user message content. `text` is always on. */
export type OrgChatInputModality = "text" | "image";

/**
 * Model-level input capabilities (ALW-453).
 *
 * Documented per catalog offering — not inferred from the SDK — because
 * OpenAI-compatible endpoints advertise the same wire shape while rejecting
 * non-text parts at runtime (e.g. z.ai coding-plan `glm-5.2` →
 * `messages.content.type is invalid, allowed values: ['text']`). The same
 * provider can host both text-only and vision models.
 */
export interface OrgChatModelCapabilities {
  provider: OrgChatProvider;
  /** Bare model id (e.g. `google/gemini-3-flash`) — same as message metadata. */
  entryId: string;
  inputModalities: readonly OrgChatInputModality[];
  supportsImageInput: boolean;
}

const PROVIDERS: readonly OrgChatProvider[] = [
  "vercel-gateway",
  "workers-ai",
  "zai-coding-plan",
];

const DEFAULT_PROVIDER: OrgChatProvider = "vercel-gateway";

/**
 * How to construct each provider's client. `gateway` uses the AI SDK's Vercel
 * gateway; `openai-compatible` points `createOpenAICompatible` at a base URL.
 * `gatewayPath` is the segment appended after the Cloudflare AI Gateway id when
 * the CF gateway is enabled (a `custom-<slug>` for third-party upstreams, or the
 * native provider path for Workers AI). `baseURL` is the direct (no-CF-gateway)
 * origin; Workers AI derives it from the account id at resolve time.
 */
type ProviderBuild =
  | { kind: "gateway" }
  | {
      kind: "openai-compatible";
      providerName: string;
      baseURL?: string;
      gatewayPath: string;
    };

const PROVIDER_BUILD: Record<OrgChatProvider, ProviderBuild> = {
  "vercel-gateway": { kind: "gateway" },
  "zai-coding-plan": {
    kind: "openai-compatible",
    providerName: "zaiCodingPlan",
    baseURL: "https://api.z.ai/api/coding/paas/v4",
    gatewayPath: "custom-zai/api/coding/paas/v4",
  },
  "workers-ai": {
    kind: "openai-compatible",
    providerName: "workersAi",
    // Direct base URL is derived from CF_ACCOUNT_ID at resolve time.
    gatewayPath: "workers-ai/v1",
  },
};

/** GLM streams reasoning; enable thinking and keep the raw stream. */
const ZAI_THINKING: ProviderOptions = {
  zaiCodingPlan: { thinking: { type: "enabled" }, clear_thinking: false },
};

interface ModelOffering {
  provider: OrgChatProvider;
  /** Model id sent to the provider (e.g. `google/gemini-3-flash`, `glm-5.2`). */
  entryId: string;
  /** Total context window (tokens) — drives the compaction budget. */
  contextWindow: number;
  /** User-message input modalities this model accepts. */
  inputModalities: readonly OrgChatInputModality[];
  /** Per-model provider options, applied via middleware. */
  providerOptions?: ProviderOptions;
}

// Update this catalog when a new chat model is adopted. The first entry for a
// provider is its default when `ORG_CHAT_MODEL` is unset.
const MODEL_OFFERINGS: readonly ModelOffering[] = [
  {
    provider: "vercel-gateway",
    entryId: "google/gemini-3-flash",
    contextWindow: 1_000_000,
    inputModalities: ["text", "image"],
  },
  {
    provider: "zai-coding-plan",
    entryId: "glm-5.2",
    contextWindow: 200_000,
    inputModalities: ["text"],
    providerOptions: ZAI_THINKING,
  },
  {
    provider: "workers-ai",
    entryId: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    contextWindow: 128_000,
    inputModalities: ["text"],
  },
];

// Conservative window for an unrecognized model id. Sized to the smallest
// mainstream window so the derived budget never overruns an unknown model.
const DEFAULT_CONTEXT_WINDOW = 128_000;

// Compact when input tokens reach this fraction of the model's window, leaving
// headroom for the response plus the next user turn before the hard ceiling.
const COMPACTION_FRACTION = 0.75;

/** The resolved construction plan for the org chat model — pure, no SDK calls. */
export type OrgChatModelConfig = {
  provider: OrgChatProvider;
  entryId: string;
  /** `<provider>/<entryId>` — used for logging/identity (not persisted). */
  modelId: string;
  contextWindow: number;
  providerOptions?: ProviderOptions;
} & (
  | { kind: "gateway"; apiKey?: string }
  | {
      kind: "openai-compatible";
      providerName: string;
      baseURL: string;
      apiKey?: string;
      cloudflareGateway: boolean;
      /** Extra request headers (the `cf-aig-authorization` gateway token). */
      headers?: Record<string, string>;
    }
);

export interface ResolvedOrgChatModel {
  model: LanguageModel;
  /** The bare provider model id (e.g. `google/gemini-3-flash`), stamped on
   *  message metadata — kept prefix-free to preserve the persisted format. */
  modelId: string;
  contextWindow: number;
  provider: OrgChatProvider;
  capabilities: OrgChatModelCapabilities;
}

/** Minimal part shape used when gating attachments against provider capabilities. */
export interface ChatAttachmentPart {
  type: string;
  mediaType?: string;
}

export type AttachmentGateResult = { ok: true } | { ok: false; reason: string };

function capabilitiesFromOffering(
  offering: ModelOffering
): OrgChatModelCapabilities {
  return {
    provider: offering.provider,
    entryId: offering.entryId,
    inputModalities: offering.inputModalities,
    supportsImageInput: offering.inputModalities.includes("image"),
  };
}

/**
 * Resolve the active org-chat model's input capabilities from env.
 * Pure — same `selectProvider` + `selectOffering` path as model resolve.
 */
export function resolveOrgChatCapabilities(
  env: OrgInferenceEnv
): OrgChatModelCapabilities {
  const provider = selectProvider(env);
  const offering = selectOffering(provider, env);
  return capabilitiesFromOffering(offering);
}

/**
 * Gate file/image parts against provider capabilities before the model call.
 *
 * - Text-only providers: any `file` part is rejected.
 * - Image-capable providers: only `image/*` file parts are allowed; other
 *   media types (e.g. text files, PDFs) are rejected before the API call.
 */
export function gateChatAttachments(
  parts: readonly ChatAttachmentPart[],
  capabilities: OrgChatModelCapabilities
): AttachmentGateResult {
  const fileParts = parts.filter((part) => part.type === "file");
  if (fileParts.length === 0) {
    return { ok: true };
  }
  if (!capabilities.supportsImageInput) {
    return {
      ok: false,
      reason:
        "This chat model only accepts text. Remove attachments and try again, or switch to a vision-capable provider.",
    };
  }
  const unsupported = fileParts.find(
    (part) => !part.mediaType?.startsWith("image/")
  );
  if (unsupported) {
    return {
      ok: false,
      reason:
        "Only image attachments are supported for this chat model. Remove other file types and try again.",
    };
  }
  return { ok: true };
}

function isProvider(value: string): value is OrgChatProvider {
  return (PROVIDERS as readonly string[]).includes(value);
}

function selectProvider(env: OrgInferenceEnv): OrgChatProvider {
  const raw = env.ORG_CHAT_PROVIDER?.trim();
  return raw && isProvider(raw) ? raw : DEFAULT_PROVIDER;
}

function selectOffering(
  provider: OrgChatProvider,
  env: OrgInferenceEnv
): ModelOffering {
  const override = env.ORG_CHAT_MODEL?.trim();
  if (override) {
    const known = MODEL_OFFERINGS.find(
      (o) => o.provider === provider && o.entryId === override
    );
    if (known) {
      return known;
    }
    // Allow an arbitrary model id for the provider with conservative defaults.
    return {
      provider,
      entryId: override,
      contextWindow: DEFAULT_CONTEXT_WINDOW,
      inputModalities: ["text"],
      providerOptions:
        provider === "zai-coding-plan" ? ZAI_THINKING : undefined,
    };
  }
  const def = MODEL_OFFERINGS.find((o) => o.provider === provider);
  if (!def) {
    throw new Error(`No default model registered for provider "${provider}".`);
  }
  return def;
}

function cloudflareGatewayBase(env: OrgInferenceEnv): string | null {
  if (env.CF_ACCOUNT_ID && env.CF_AIG_GATEWAY_ID && env.CF_AIG_TOKEN) {
    return `https://gateway.ai.cloudflare.com/v1/${env.CF_ACCOUNT_ID}/${env.CF_AIG_GATEWAY_ID}`;
  }
  return null;
}

/** The env var carrying each provider's API key (for clear error messages). */
const KEY_VAR: Record<OrgChatProvider, string> = {
  "vercel-gateway": "AI_GATEWAY_API_KEY",
  "zai-coding-plan": "ZAI_API_KEY",
  "workers-ai": "WORKERS_AI_API_TOKEN",
};

function apiKeyFor(
  provider: OrgChatProvider,
  env: OrgInferenceEnv
): string | undefined {
  switch (provider) {
    case "vercel-gateway":
      return env.AI_GATEWAY_API_KEY;
    case "zai-coding-plan":
      return env.ZAI_API_KEY;
    case "workers-ai":
      return env.WORKERS_AI_API_TOKEN;
    default:
      return;
  }
}

function effectiveBaseURL(
  provider: OrgChatProvider,
  build: Extract<ProviderBuild, { kind: "openai-compatible" }>,
  env: OrgInferenceEnv
): string {
  const gatewayBase = cloudflareGatewayBase(env);
  if (gatewayBase) {
    return `${gatewayBase}/${build.gatewayPath}`;
  }
  if (provider === "workers-ai") {
    if (!env.CF_ACCOUNT_ID) {
      throw new Error(
        "workers-ai provider requires CF_ACCOUNT_ID (or a configured Cloudflare AI Gateway)."
      );
    }
    return `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/ai/v1`;
  }
  if (!build.baseURL) {
    throw new Error(`No base URL configured for provider "${provider}".`);
  }
  return build.baseURL;
}

/**
 * Resolve the construction plan for the org chat model from env. Pure — makes no
 * SDK/network calls — so the provider/model/URL/gateway decisions are testable.
 */
export function resolveOrgChatModelConfig(
  env: OrgInferenceEnv
): OrgChatModelConfig {
  const provider = selectProvider(env);
  const offering = selectOffering(provider, env);
  const base = {
    provider,
    entryId: offering.entryId,
    modelId: `${provider}/${offering.entryId}`,
    contextWindow: offering.contextWindow,
    providerOptions: offering.providerOptions,
  };
  const build = PROVIDER_BUILD[provider];
  if (build.kind === "gateway") {
    return { ...base, kind: "gateway", apiKey: env.AI_GATEWAY_API_KEY };
  }
  const baseURL = effectiveBaseURL(provider, build, env);
  const apiKey = apiKeyFor(provider, env);
  // Fail fast at resolve time with a clear message rather than a cryptic 401 on
  // the first inference — the registry's provider selection is explicit, so its
  // key must be present. (`vercel-gateway` is exempt: it also supports OIDC.)
  if (!apiKey) {
    throw new Error(
      `ORG_CHAT_PROVIDER="${provider}" requires ${KEY_VAR[provider]} to be set.`
    );
  }
  // The upstream provider key travels as `Authorization: Bearer <apiKey>` (set
  // by `createOpenAICompatible`); when a Cloudflare AI Gateway fronts it, the
  // gateway token authenticates the gateway itself via `cf-aig-authorization:
  // Bearer <token>` (per CF's provider docs — the Bearer prefix is required).
  const cloudflareGateway = cloudflareGatewayBase(env) !== null;
  return {
    ...base,
    kind: "openai-compatible",
    providerName: build.providerName,
    baseURL,
    apiKey,
    cloudflareGateway,
    headers: cloudflareGateway
      ? { "cf-aig-authorization": `Bearer ${env.CF_AIG_TOKEN}` }
      : undefined,
  };
}

/** Exported for test coverage. */
export function buildOrgChatModel(config: OrgChatModelConfig): LanguageModel {
  let model: LanguageModel;
  if (config.kind === "gateway") {
    model = createGateway({ apiKey: config.apiKey })(config.entryId);
  } else {
    model = createOpenAICompatible({
      name: config.providerName,
      baseURL: config.baseURL,
      apiKey: config.apiKey,
      headers: config.headers,
    }).chatModel(config.entryId);
  }
  if (!config.providerOptions) {
    return model;
  }
  return wrapLanguageModel({
    model,
    middleware: defaultSettingsMiddleware({
      settings: { providerOptions: config.providerOptions },
    }),
  });
}

/**
 * Resolve the org chat model from the runtime env. The result is constant for
 * a given env, so callers resolve it once (in `onStart`) rather than per turn.
 */
export function resolveOrgChatModel(env: Cloudflare.Env): ResolvedOrgChatModel {
  // The provider secrets/config are `.dev.vars` values not present on the
  // generated `Cloudflare.Env`; read them through the optional view.
  const cfg = env as unknown as OrgInferenceEnv;
  const config = resolveOrgChatModelConfig(cfg);
  return {
    model: buildOrgChatModel(config),
    // Stamp the bare model id (no provider prefix) to preserve the persisted
    // message-metadata format.
    modelId: config.entryId,
    contextWindow: config.contextWindow,
    provider: config.provider,
    capabilities: capabilitiesFromOffering(
      selectOffering(config.provider, cfg)
    ),
  };
}

/**
 * Token budget above which the chat history should be compacted, derived from
 * the resolved model's context window. Both the pre-turn heuristic backstop
 * (`compactAfter`) and the post-turn real-usage trigger use this so they agree.
 */
export function getCompactionLimit(contextWindow: number): number {
  return Math.floor(contextWindow * COMPACTION_FRACTION);
}
