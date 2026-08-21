"use client";

import { useVoiceAgent } from "@cloudflare/voice/react";
import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/shadcn/card";
import { Mic, MicOff, Phone, PhoneOff } from "lucide-react";
import { m } from "@/paraglide/messages.js";

export interface VoiceCallPanelProps {
  sessionName: string;
}

function statusLabel(status: string): string {
  switch (status) {
    case "listening":
      return m.voice_status_listening();
    case "thinking":
      return m.voice_status_thinking();
    case "speaking":
      return m.voice_status_speaking();
    default:
      return m.voice_status_idle();
  }
}

export function VoiceCallPanel({ sessionName }: VoiceCallPanelProps) {
  const {
    status,
    transcript,
    interimTranscript,
    metrics,
    error,
    isMuted,
    startCall,
    endCall,
    toggleMute,
  } = useVoiceAgent({
    agent: "VoiceLabAgent",
    name: sessionName,
  });

  const inCall = status !== "idle";

  return (
    <div className="grid @md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{m.voice_call_title()}</CardTitle>
          <CardDescription>{m.voice_call_description()}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            {m.voice_status_label()} {statusLabel(status)}
          </p>
          {metrics ? (
            <p className="text-muted-foreground text-sm">
              {m.voice_metrics({ ms: String(metrics.first_audio_ms) })}
            </p>
          ) : null}
          {error ? (
            <p className="text-destructive text-sm">
              {m.voice_error()}: {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                if (inCall) {
                  endCall();
                  return;
                }
                startCall().catch(() => undefined);
              }}
              variant={inCall ? "destructive" : "default"}
            >
              {inCall ? (
                <PhoneOff className="size-4" />
              ) : (
                <Phone className="size-4" />
              )}
              {inCall ? m.voice_end() : m.voice_start()}
            </Button>
            <Button
              disabled={!inCall}
              onClick={() => {
                toggleMute();
              }}
              variant="outline"
            >
              {isMuted ? (
                <MicOff className="size-4" />
              ) : (
                <Mic className="size-4" />
              )}
              {isMuted ? m.voice_unmute() : m.voice_mute()}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{m.voice_transcript()}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {transcript.length === 0 && !interimTranscript ? (
            <p className="text-muted-foreground text-sm">
              {m.voice_transcript_empty()}
            </p>
          ) : null}
          {transcript.map((message) => (
            <p className="text-sm" key={`${message.role}-${message.timestamp}`}>
              <span className="font-medium">
                {message.role === "user"
                  ? m.voice_role_you()
                  : m.voice_role_agent()}
                :{" "}
              </span>
              {message.text}
            </p>
          ))}
          {interimTranscript ? (
            <p className="text-muted-foreground text-sm italic">
              {m.voice_interim()}: {interimTranscript}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
