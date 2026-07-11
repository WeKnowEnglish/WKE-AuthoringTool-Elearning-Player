"use client";

import { useLiveGameLobby } from "@/lib/live-game/liveblocks/use-live-game-lobby";
import type { LiveGameResourceNodeState } from "@/lib/live-game/liveblocks/config";

export function useLiveGameSession() {
  return useLiveGameLobby().session;
}

export function sumTreesChopped(resourceNodes: Record<string, LiveGameResourceNodeState>): number {
  let total = 0;
  for (const node of Object.values(resourceNodes)) {
    total += node.collectedCount ?? 0;
  }
  return total;
}
