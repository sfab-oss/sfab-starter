"use client";

import { useCallback, useRef, useState } from "react";

export type RecordingState = "idle" | "recording" | "processing" | "error";

export interface UseAudioRecorderReturn {
  isRecording: boolean;
  isProcessing: boolean;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob>;
  cancelRecording: () => void;
  state: RecordingState;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [state, setState] = useState<RecordingState>("idle");
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const isRecording = state === "recording";
  const isProcessing = state === "processing";

  const cleanup = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    chunksRef.current = [];
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setState("processing");

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      chunksRef.current = [];

      // Determine supported audio format
      const mimeType = getSupportedMimeType();

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = () => {
        setState("idle");
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setState("recording");
    } catch (err) {
      console.error("Failed to start recording:", err);
      setState("error");

      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          setError("Microphone access is required for voice input");
        } else if (err.name === "NotFoundError") {
          setError("No microphone found on this device");
        } else {
          setError("Recording failed. Please try again.");
        }
      } else {
        setError("Recording failed. Please try again.");
      }

      cleanup();
    }
  }, [cleanup]);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorderRef.current || state !== "recording") {
        reject(new Error("No active recording"));
        return;
      }

      setState("processing");

      const mediaRecorder = mediaRecorderRef.current;

      // Handle the stop event
      const handleStop = () => {
        mediaRecorder.removeEventListener("stop", handleStop);

        // Create blob from collected chunks
        const mimeType = getSupportedMimeType();
        const blob = new Blob(chunksRef.current, { type: mimeType });

        // Cleanup
        cleanup();

        resolve(blob);
      };

      mediaRecorder.addEventListener("stop", handleStop);

      // Stop recording
      mediaRecorder.stop();

      // Stop all tracks
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) {
          track.stop();
        }
      }
    });
  }, [state, cleanup]);

  const cancelRecording = useCallback(() => {
    cleanup();
    setState("idle");
    setError(null);
  }, [cleanup]);

  return {
    isRecording,
    isProcessing,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    state,
  };
}

// Helper function to get supported MIME type
function getSupportedMimeType(): string {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/wav",
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  // Fallback to default
  return "";
}
