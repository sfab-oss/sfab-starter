"use client";

import { memo } from "react";
import { MemoryCard } from "@/components/chat/memory/memory-card";

export const MemoryDisplay = memo(() => <MemoryCard />);

MemoryDisplay.displayName = "MemoryDisplay";
