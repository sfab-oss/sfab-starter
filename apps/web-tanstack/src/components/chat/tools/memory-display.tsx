"use client";

import { memo } from "react";
import { MemoryCard } from "@/components/chat/memory/memory-card";

/**
 * Inline renderer for the agent's `display-memory` tool. The tool carries no
 * payload — `MemoryCard` fetches the current shared memory itself — so this is
 * a thin wrapper that drops the card into the transcript.
 */
export const MemoryDisplay = memo(() => <MemoryCard />);

MemoryDisplay.displayName = "MemoryDisplay";
