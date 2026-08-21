import {
  type VoiceTurnContext,
  WorkersAIFluxSTT,
  withVoice,
} from "@cloudflare/voice";
import { ElevenLabsTTS } from "@cloudflare/voice-elevenlabs";
import { Agent } from "agents";
import { streamText } from "ai";
import { resolveOrgChatModel } from "../inference/chat-models";
import {
  elevenLabsVoiceId,
  requireElevenLabsApiKey,
  VOICE_LAB_SYSTEM_PROMPT,
  voiceLabBindings,
} from "./env";

const VoiceLabBase = withVoice(Agent);

export class VoiceLabAgent extends VoiceLabBase<Cloudflare.Env> {
  override onStart(): void {
    const env = voiceLabBindings(this.env);
    this.transcriber = new WorkersAIFluxSTT(env.AI);
    this.tts = new ElevenLabsTTS({
      apiKey: requireElevenLabsApiKey(env),
      voiceId: elevenLabsVoiceId(env),
      modelId: "eleven_flash_v2_5",
    });
  }

  override afterTranscribe(transcript: string): string | null {
    const trimmed = transcript.trim();
    return trimmed.length < 3 ? null : trimmed;
  }

  override onTurn(transcript: string, context: VoiceTurnContext) {
    const { model } = resolveOrgChatModel(this.env);
    const result = streamText({
      model,
      system: VOICE_LAB_SYSTEM_PROMPT,
      messages: [
        ...context.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        { role: "user" as const, content: transcript },
      ],
      abortSignal: context.signal,
    });
    return Promise.resolve(result.textStream);
  }
}
