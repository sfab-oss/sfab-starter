import {
  buildOrgChatModel,
  gateChatAttachments,
  getCompactionLimit,
  type OrgChatModelCapabilities,
  type OrgInferenceEnv,
  resolveOrgChatCapabilities,
  resolveOrgChatModel,
  resolveOrgChatModelConfig,
} from "@workspace/agent/inference";
import { describe, expect, it } from "vitest";

/**
 * ALW-411 — the provider decision (which provider, model, base URL, key, and
 * whether Cloudflare AI Gateway fronts it) is a pure function, so we assert it
 * directly without touching the network or an SDK client.
 *
 * ALW-453 — model input capabilities + attachment gating are also pure.
 */

const NEEDS_ACCOUNT_ID = /CF_ACCOUNT_ID/;
const NEEDS_ZAI_KEY = /ZAI_API_KEY/;
const NEEDS_WORKERS_AI_TOKEN = /WORKERS_AI_API_TOKEN/;
const ONLY_ACCEPTS_TEXT = /only accepts text/i;
const ONLY_IMAGE = /only image/i;

function env(overrides: OrgInferenceEnv = {}): OrgInferenceEnv {
  return overrides;
}

describe("resolveOrgChatModelConfig", () => {
  it("AC-1: defaults to vercel-gateway / gemini-3-flash with no env set", () => {
    const config = resolveOrgChatModelConfig(env());
    expect(config.provider).toBe("vercel-gateway");
    expect(config.kind).toBe("gateway");
    expect(config.entryId).toBe("google/gemini-3-flash");
    expect(config.modelId).toBe("vercel-gateway/google/gemini-3-flash");
    expect(config.contextWindow).toBe(1_000_000);
  });

  it("AC-1: passes the Vercel gateway key through when set", () => {
    const config = resolveOrgChatModelConfig(env({ AI_GATEWAY_API_KEY: "vk" }));
    expect(config).toMatchObject({ kind: "gateway", apiKey: "vk" });
  });

  it("falls back to the default provider for an unknown ORG_CHAT_PROVIDER", () => {
    const config = resolveOrgChatModelConfig(
      env({ ORG_CHAT_PROVIDER: "nonsense" })
    );
    expect(config.provider).toBe("vercel-gateway");
  });

  it("AC-2: routes GLM through z.ai's openai-compatible endpoint with thinking", () => {
    const config = resolveOrgChatModelConfig(
      env({ ORG_CHAT_PROVIDER: "zai-coding-plan", ZAI_API_KEY: "zk" })
    );
    expect(config.provider).toBe("zai-coding-plan");
    if (config.kind !== "openai-compatible") {
      throw new Error("expected openai-compatible");
    }
    expect(config.providerName).toBe("zaiCodingPlan");
    expect(config.baseURL).toBe("https://api.z.ai/api/coding/paas/v4");
    expect(config.apiKey).toBe("zk");
    expect(config.cloudflareGateway).toBe(false);
    expect(config.entryId).toBe("glm-5.2");
    expect(config.providerOptions).toMatchObject({
      zaiCodingPlan: { thinking: { type: "enabled" } },
    });
  });

  it("honours an ORG_CHAT_MODEL override within the provider", () => {
    const config = resolveOrgChatModelConfig(
      env({
        ORG_CHAT_PROVIDER: "zai-coding-plan",
        ZAI_API_KEY: "zk",
        ORG_CHAT_MODEL: "glm-4.6",
      })
    );
    expect(config.entryId).toBe("glm-4.6");
    // An unknown-to-catalog model still carries the provider's thinking options.
    expect(config.providerOptions).toBeDefined();
  });

  it("AC-3: resolves a Workers AI model via the account-scoped openai endpoint (no binding)", () => {
    const config = resolveOrgChatModelConfig(
      env({
        ORG_CHAT_PROVIDER: "workers-ai",
        CF_ACCOUNT_ID: "acct123",
        WORKERS_AI_API_TOKEN: "cf-token",
      })
    );
    if (config.kind !== "openai-compatible") {
      throw new Error("expected openai-compatible");
    }
    expect(config.baseURL).toBe(
      "https://api.cloudflare.com/client/v4/accounts/acct123/ai/v1"
    );
    expect(config.apiKey).toBe("cf-token");
    expect(config.entryId).toBe("@cf/meta/llama-3.3-70b-instruct-fp8-fast");
  });

  it("AC-3: workers-ai without an account id or gateway is a clear error", () => {
    expect(() =>
      resolveOrgChatModelConfig(env({ ORG_CHAT_PROVIDER: "workers-ai" }))
    ).toThrow(NEEDS_ACCOUNT_ID);
  });

  it("AC-4: routes openai-compatible providers through the Cloudflare AI Gateway when configured", () => {
    const config = resolveOrgChatModelConfig(
      env({
        ORG_CHAT_PROVIDER: "zai-coding-plan",
        ZAI_API_KEY: "zk",
        CF_ACCOUNT_ID: "acct123",
        CF_AIG_GATEWAY_ID: "my-gw",
        CF_AIG_TOKEN: "aig-token",
      })
    );
    if (config.kind !== "openai-compatible") {
      throw new Error("expected openai-compatible");
    }
    expect(config.cloudflareGateway).toBe(true);
    expect(config.baseURL).toBe(
      "https://gateway.ai.cloudflare.com/v1/acct123/my-gw/custom-zai/api/coding/paas/v4"
    );
    // The upstream provider key is still carried (Authorization); the gateway
    // token is attached as the `cf-aig-authorization` header — with the `Bearer`
    // prefix, per Cloudflare's provider docs.
    expect(config.apiKey).toBe("zk");
    expect(config.headers).toEqual({
      "cf-aig-authorization": "Bearer aig-token",
    });
  });

  it("AC-4: workers-ai through the CF gateway uses the native provider path", () => {
    const config = resolveOrgChatModelConfig(
      env({
        ORG_CHAT_PROVIDER: "workers-ai",
        WORKERS_AI_API_TOKEN: "cf-token",
        CF_ACCOUNT_ID: "acct123",
        CF_AIG_GATEWAY_ID: "my-gw",
        CF_AIG_TOKEN: "aig-token",
      })
    );
    if (config.kind !== "openai-compatible") {
      throw new Error("expected openai-compatible");
    }
    expect(config.baseURL).toBe(
      "https://gateway.ai.cloudflare.com/v1/acct123/my-gw/workers-ai/v1"
    );
  });

  it("AC-4: a partial CF gateway config does not enable the gateway", () => {
    const config = resolveOrgChatModelConfig(
      env({
        ORG_CHAT_PROVIDER: "zai-coding-plan",
        ZAI_API_KEY: "zk",
        CF_ACCOUNT_ID: "acct123",
        // no CF_AIG_GATEWAY_ID / CF_AIG_TOKEN
      })
    );
    if (config.kind !== "openai-compatible") {
      throw new Error("expected openai-compatible");
    }
    expect(config.cloudflareGateway).toBe(false);
    expect(config.baseURL).toBe("https://api.z.ai/api/coding/paas/v4");
    expect(config.headers).toBeUndefined();
  });

  it("throws a clear error when an explicitly-selected provider's key is missing", () => {
    expect(() =>
      resolveOrgChatModelConfig(env({ ORG_CHAT_PROVIDER: "zai-coding-plan" }))
    ).toThrow(NEEDS_ZAI_KEY);
    expect(() =>
      resolveOrgChatModelConfig(
        env({ ORG_CHAT_PROVIDER: "workers-ai", CF_ACCOUNT_ID: "acct123" })
      )
    ).toThrow(NEEDS_WORKERS_AI_TOKEN);
  });
});

describe("buildOrgChatModel", () => {
  it("constructs the default vercel-gateway model", () => {
    const model = buildOrgChatModel(resolveOrgChatModelConfig(env()));
    expect(model).toBeDefined();
  });

  it("constructs an openai-compatible model (origin and CF-gateway branches)", () => {
    const direct = buildOrgChatModel(
      resolveOrgChatModelConfig(
        env({ ORG_CHAT_PROVIDER: "zai-coding-plan", ZAI_API_KEY: "zk" })
      )
    );
    expect(direct).toBeDefined();

    const gatewayed = buildOrgChatModel(
      resolveOrgChatModelConfig(
        env({
          ORG_CHAT_PROVIDER: "zai-coding-plan",
          ZAI_API_KEY: "zk",
          CF_ACCOUNT_ID: "acct123",
          CF_AIG_GATEWAY_ID: "my-gw",
          CF_AIG_TOKEN: "aig-token",
        })
      )
    );
    expect(gatewayed).toBeDefined();
  });
});

describe("resolveOrgChatModel", () => {
  it("stamps the bare model id (no provider prefix) for message metadata", () => {
    const resolved = resolveOrgChatModel({} as unknown as Cloudflare.Env);
    expect(resolved.modelId).toBe("google/gemini-3-flash");
    expect(resolved.contextWindow).toBe(1_000_000);
    expect(resolved.model).toBeDefined();
    expect(resolved.provider).toBe("vercel-gateway");
    expect(resolved.capabilities.supportsImageInput).toBe(true);
  });
});

describe("getCompactionLimit", () => {
  it("is 75% of the context window", () => {
    expect(getCompactionLimit(1_000_000)).toBe(750_000);
    expect(getCompactionLimit(128_000)).toBe(96_000);
  });
});

describe("org chat model capabilities (ALW-453)", () => {
  it("resolves modalities from the active catalog offering per provider", () => {
    expect(resolveOrgChatCapabilities(env())).toEqual({
      provider: "vercel-gateway",
      entryId: "google/gemini-3-flash",
      inputModalities: ["text", "image"],
      supportsImageInput: true,
    });
    expect(
      resolveOrgChatCapabilities(env({ ORG_CHAT_PROVIDER: "zai-coding-plan" }))
    ).toEqual({
      provider: "zai-coding-plan",
      entryId: "glm-5.2",
      inputModalities: ["text"],
      supportsImageInput: false,
    });
    expect(
      resolveOrgChatCapabilities(env({ ORG_CHAT_PROVIDER: "workers-ai" }))
    ).toEqual({
      provider: "workers-ai",
      entryId: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      inputModalities: ["text"],
      supportsImageInput: false,
    });
  });

  it("defaults unknown ORG_CHAT_MODEL overrides to text-only", () => {
    expect(
      resolveOrgChatCapabilities(
        env({
          ORG_CHAT_PROVIDER: "zai-coding-plan",
          ORG_CHAT_MODEL: "glm-4.6",
        })
      )
    ).toEqual({
      provider: "zai-coding-plan",
      entryId: "glm-4.6",
      inputModalities: ["text"],
      supportsImageInput: false,
    });
  });
});

describe("gateChatAttachments (ALW-453)", () => {
  const textOnly: OrgChatModelCapabilities = {
    provider: "zai-coding-plan",
    entryId: "glm-5.2",
    inputModalities: ["text"],
    supportsImageInput: false,
  };
  const vision: OrgChatModelCapabilities = {
    provider: "vercel-gateway",
    entryId: "google/gemini-3-flash",
    inputModalities: ["text", "image"],
    supportsImageInput: true,
  };

  it("allows text-only parts on every model", () => {
    expect(gateChatAttachments([{ type: "text" }], textOnly)).toEqual({
      ok: true,
    });
    expect(gateChatAttachments([{ type: "text" }], vision)).toEqual({
      ok: true,
    });
  });

  it("rejects any file part on text-only models before the API call", () => {
    const result = gateChatAttachments(
      [{ type: "text" }, { type: "file", mediaType: "image/png" }],
      textOnly
    );
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected rejection");
    }
    expect(result.reason).toMatch(ONLY_ACCEPTS_TEXT);
  });

  it("rejects non-image files on vision-capable models", () => {
    const result = gateChatAttachments(
      [{ type: "file", mediaType: "text/plain" }],
      vision
    );
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected rejection");
    }
    expect(result.reason).toMatch(ONLY_IMAGE);
  });

  it("allows image file parts on vision-capable models", () => {
    expect(
      gateChatAttachments(
        [{ type: "text" }, { type: "file", mediaType: "image/png" }],
        vision
      )
    ).toEqual({ ok: true });
  });
});
