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
  },
  {
    provider: "zai-coding-plan",
    entryId: "glm-5.2",
    contextWindow: 200_000,
    providerOptions: ZAI_THINKING,
  },
  {
    provider: "workers-ai",
    entryId: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    contextWindow: 128_000,
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
  /** `<provider>/<entryId>` — stamped on messages and used for logging. */
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
      /** True when the base URL points at a Cloudflare AI Gateway endpoint. */
      cloudflareGateway: boolean;
    }
);

export interface ResolvedOrgChatModel {
  model: LanguageModel;
  modelId: string;
  contextWindow: number;
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

/** The Cloudflare AI Gateway base, or null when the gateway is not configured. */
function cloudflareGatewayBase(env: OrgInferenceEnv): string | null {
  if (env.CF_ACCOUNT_ID && env.CF_AIG_GATEWAY_ID && env.CF_AIG_TOKEN) {
    return `https://gateway.ai.cloudflare.com/v1/${env.CF_ACCOUNT_ID}/${env.CF_AIG_GATEWAY_ID}`;
  }
  return null;
}

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
      return undefined;
  }
}

/** Effective base URL for an openai-compatible provider, honouring the CF gateway. */
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
  return {
    ...base,
    kind: "openai-compatible",
    providerName: build.providerName,
    baseURL: effectiveBaseURL(provider, build, env),
    apiKey: apiKeyFor(provider, env),
    cloudflareGateway: cloudflareGatewayBase(env) !== null,
  };
}

function buildFromConfig(
  config: OrgChatModelConfig,
  env: OrgInferenceEnv
): LanguageModel {
  let model: LanguageModel;
  if (config.kind === "gateway") {
    model = createGateway({ apiKey: config.apiKey })(config.entryId);
  } else {
    model = createOpenAICompatible({
      name: config.providerName,
      baseURL: config.baseURL,
      apiKey: config.apiKey,
      headers: config.cloudflareGateway
        ? { "cf-aig-authorization": `Bearer ${env.CF_AIG_TOKEN}` }
        : undefined,
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
    model: buildFromConfig(config, cfg),
    modelId: config.modelId,
    contextWindow: config.contextWindow,
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
