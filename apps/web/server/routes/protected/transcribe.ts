import { openai } from "@ai-sdk/openai";
import { zValidator } from "@hono/zod-validator";
import type { HonoContextWithAuth } from "@workspace/types/hono";
import {
  NoOutputGeneratedError,
  experimental_transcribe as transcribe,
} from "ai";
import { Hono } from "hono";
import { z } from "zod";

const transcribeRoutes = new Hono<HonoContextWithAuth>().post(
  "/",
  zValidator(
    "form",
    z.object({
      audio: z.instanceof(File),
    })
  ),
  async (c) => {
    try {
      const { audio } = c.req.valid("form");

      if (!audio) {
        return c.json({ error: "No audio file provided" }, 400);
      }

      // Extract base MIME type (remove codec specifications)
      const baseMimeType = audio.type.split(";")[0] || "audio/webm";

      // OpenAI Whisper supported formats
      const supportedFormats = [
        "audio/flac",
        "audio/m4a",
        "audio/mp3",
        "audio/mp4",
        "audio/mpeg",
        "audio/mpga",
        "audio/oga",
        "audio/ogg",
        "audio/wav",
        "audio/webm",
      ];

      // Validate file type
      if (!baseMimeType.startsWith("audio/")) {
        return c.json(
          { error: "Invalid file type. Expected audio file." },
          400
        );
      }

      // Check if base audio format is supported by OpenAI
      if (!supportedFormats.includes(baseMimeType)) {
        return c.json(
          {
            error: `Unsupported audio format: ${baseMimeType}. Supported formats: ${supportedFormats.join(", ")}`,
          },
          400
        );
      }

      // Check file size (limit to 25MB for Whisper)
      if (audio.size > 25 * 1024 * 1024) {
        return c.json(
          { error: "Audio file too large. Maximum size is 25MB." },
          400
        );
      }

      try {
        // Convert to ArrayBuffer as required by AI SDK
        const audioArrayBuffer = await audio.arrayBuffer();

        const result = await transcribe({
          model: openai.transcription("whisper-1"),
          audio: audioArrayBuffer,
          providerOptions: {
            openai: {
              response_format: "verbose_json", // Get more detailed response
              temperature: 0, // More consistent results
            },
          },
        });

        if (!result.text.trim()) {
          return c.json({ text: null });
        }

        return c.json({
          text: result.text,
          language: result.language,
        });
      } catch (error) {
        if (NoOutputGeneratedError.isInstance(error)) {
          return c.json(
            { error: "No speech detected in audio. Please try again." },
            400
          );
        }
        throw error;
      }
    } catch (error) {
      console.error("Transcription error:", error);
      return c.json(
        { error: "Failed to transcribe audio. Please try again." },
        500
      );
    }
  }
);

export default transcribeRoutes;
