import { describe, expect, it } from "vitest";
import {
  DEFAULT_ELEVENLABS_VOICE_ID,
  elevenLabsVoiceId,
  requireElevenLabsApiKey,
  type VoiceLabBindings,
} from "./env";

const missingKey = /ELEVENLABS_API_KEY/;

function bindings(overrides: Partial<VoiceLabBindings> = {}): VoiceLabBindings {
  return {
    AI: { run: async () => null },
    ...overrides,
  };
}

describe("voice lab env", () => {
  it("requires an ElevenLabs API key", () => {
    expect(() => requireElevenLabsApiKey(bindings())).toThrow(missingKey);
    expect(
      requireElevenLabsApiKey(bindings({ ELEVENLABS_API_KEY: " sk " }))
    ).toBe("sk");
  });

  it("falls back to the default ElevenLabs voice", () => {
    expect(elevenLabsVoiceId(bindings())).toBe(DEFAULT_ELEVENLABS_VOICE_ID);
    expect(
      elevenLabsVoiceId(bindings({ ELEVENLABS_VOICE_ID: " custom-voice " }))
    ).toBe("custom-voice");
  });
});
