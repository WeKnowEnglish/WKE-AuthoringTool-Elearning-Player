"use client";

import { useCallback } from "react";
import { useOthers, useSelf, useStorage } from "@liveblocks/react/suspense";
import type { LiveGameLobbyPlayer, LiveGameStorageSnapshot } from "@/lib/live-game/liveblocks/config";
import type { LiveGameRoundEndReason } from "@/lib/live-game/liveblocks/config";
import { toRoomId } from "@/lib/live-game/liveblocks/room-id";

export type LiveGameLobbyPlayerEntry = {
  id: string;
  player: LiveGameLobbyPlayer;
};

function readLiveGameStorageSnapshot(root: unknown): LiveGameStorageSnapshot {
  return root as LiveGameStorageSnapshot;
}

export function useLiveGameLobby() {
  const self = useSelf();
  const others = useOthers();
  const session = useStorage((root) => readLiveGameStorageSnapshot(root).session);
  const players = useStorage((root) => {
    const entries: LiveGameLobbyPlayerEntry[] = [];
    const playersRecord = readLiveGameStorageSnapshot(root).players ?? {};
    for (const [id, player] of Object.entries(playersRecord)) {
      entries.push({ id, player });
    }
    entries.sort((a, b) => a.player.joinedAt - b.player.joinedAt);
    return entries;
  });

  const control = useCallback(async (action: string, reason?: LiveGameRoundEndReason) => {
    const response = await fetch("/api/live-game/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: toRoomId(session.joinCode), action, reason }),
    });
    const payload = (await response.json()) as { error?: string; endsAt?: number | null };
    if (!response.ok) throw new Error(payload.error ?? "Live-game control action failed.");
    return payload;
  }, [session.joinCode]);
  const startGame = useCallback(() => void control("start"), [control]);
  const returnToLobby = useCallback(() => void control("return_to_lobby"), [control]);
  const closeLobby = useCallback(() => void control("close"), [control]);
  const endRoundAndReturnToLobby = useCallback(
    (reason: LiveGameRoundEndReason) => void control("end_round", reason),
    [control],
  );
  const addMinute = useCallback(() => control("add_time"), [control]);

  const selfEntry = players.find((entry) => entry.id === self.id) ?? null;
  const isHost = selfEntry?.player.role === "host";

  return {
    self,
    others,
    session,
    players,
    selfEntry,
    isHost,
    startGame,
    returnToLobby,
    closeLobby,
    endRoundAndReturnToLobby,
    addMinute,
  };
}

export function useLiveGameSessionPhase() {
  return useStorage((root) => readLiveGameStorageSnapshot(root).session.phase);
}
