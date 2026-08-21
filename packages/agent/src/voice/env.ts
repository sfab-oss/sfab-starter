import type { WorkersAIFluxSTT } from "@cloudflare/voice";

export const DEFAULT_ELEVENLABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

export const VOICE_LAB_SYSTEM_PROMPT =
  "You are a voice agent on a live call. Reply in short spoken sentences. No markdown, lists, or code. Match the caller's language.";

export interface VoiceLabBindings {
  AI: ConstructorParameters<typeof WorkersAIFluxSTT>[0];
  ELEVENLABS_API_KEY?: string;
  ELEVENLABS_VOICE_ID?: string;
}

export function voiceLabBindings(env: Cloudflare.Env): VoiceLabBindings {
  return env as unknown as VoiceLabBindings;
}

export function requireElevenLabsApiKey(env: VoiceLabBindings): string {
  const apiKey = env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is not set");
  }
  return apiKey;
}

export function elevenLabsVoiceId(env: VoiceLabBindings): string {
  const voiceId = env.ELEVENLABS_VOICE_ID?.trim();
  return voiceId && voiceId.length > 0 ? voiceId : DEFAULT_ELEVENLABS_VOICE_ID;
}
