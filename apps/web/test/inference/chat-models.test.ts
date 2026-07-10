import {
  buildOrgChatModel,
  gateChatAttachments,
  getCompactionLimit,
  getOrgChatProviderCapabilities,
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
 * ALW-453 — provider input capabilities + attachment gating are also pure.
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

describe("org chat provider capabilities (ALW-453)", () => {
  it("marks vercel-gateway as image-capable and zai/workers-ai as text-only", () => {
    expect(getOrgChatProviderCapabilities("vercel-gateway")).toEqual({
      provider: "vercel-gateway",
      inputModalities: ["text", "image"],
      supportsImageInput: true,
    });
    expect(getOrgChatProviderCapabilities("zai-coding-plan")).toEqual({
      provider: "zai-coding-plan",
      inputModalities: ["text"],
      supportsImageInput: false,
    });
    expect(getOrgChatProviderCapabilities("workers-ai")).toEqual({
      provider: "workers-ai",
      inputModalities: ["text"],
      supportsImageInput: false,
    });
  });

  it("resolveOrgChatCapabilities follows ORG_CHAT_PROVIDER", () => {
    expect(resolveOrgChatCapabilities(env()).supportsImageInput).toBe(true);
    expect(
      resolveOrgChatCapabilities(env({ ORG_CHAT_PROVIDER: "zai-coding-plan" }))
        .supportsImageInput
    ).toBe(false);
  });
});

describe("gateChatAttachments (ALW-453)", () => {
  const textOnly = getOrgChatProviderCapabilities("zai-coding-plan");
  const vision = getOrgChatProviderCapabilities("vercel-gateway");

  it("allows text-only parts on every provider", () => {
    expect(gateChatAttachments([{ type: "text" }], textOnly)).toEqual({
      ok: true,
    });
    expect(gateChatAttachments([{ type: "text" }], vision)).toEqual({
      ok: true,
    });
  });

  it("rejects any file part on text-only providers before the API call", () => {
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

  it("rejects non-image files on vision-capable providers", () => {
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

  it("allows image file parts on vision-capable providers", () => {
    expect(
      gateChatAttachments(
        [{ type: "text" }, { type: "file", mediaType: "image/png" }],
        vision
      )
    ).toEqual({ ok: true });
  });
});
