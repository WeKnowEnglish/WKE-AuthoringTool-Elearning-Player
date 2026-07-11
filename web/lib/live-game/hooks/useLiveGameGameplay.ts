"use client";

import { useStorage } from "@liveblocks/react/suspense";
import type { LiveGameStorageSnapshot } from "@/lib/live-game/liveblocks/config";

function readSnapshot(root: unknown): LiveGameStorageSnapshot {
  return root as LiveGameStorageSnapshot;
}

export function useLiveGameResourcePool() {
  return useStorage((root) => readSnapshot(root).resourcePool?.wood ?? 0);
}

export function useLiveGameResourceNodes() {
  return useStorage((root) => readSnapshot(root).resourceNodes ?? {});
}
