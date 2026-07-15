"use client";

import { useCallback } from "react";
import { useOthers, useSelf, useStorage } from "@liveblocks/react/suspense";
import type {
  LiveGameLobbyPlayer,
  LiveGameResourceType,
  LiveGameRoundEndReason,
  LiveGameStorageSnapshot,
} from "@/lib/live-game/liveblocks/config";
import { toRoomId } from "@/lib/live-game/liveblocks/room-id";
import { diagnosticFetch, recordLiveGameDiagnostic } from "@/lib/live-game/diagnostics/client";

/** Keep in sync with LIVE_GAME_HOST_GRANT_POOL_AMOUNT on the server. */
const HOST_GRANT_POOL_AMOUNT = 5;

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
    const diagnosticPhase = action === "start" ? "lobby" : action === "end_round" || action === "close" ? "exit" : "lobby";
    recordLiveGameDiagnostic(diagnosticPhase, `control_${action}_click`, { reason: reason ?? null });
    const response = await diagnosticFetch("/api/live-game/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: toRoomId(session.joinCode), action, reason }),
    }, { phase: diagnosticPhase, name: `control_${action}`, detail: { reason: reason ?? null } });
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

  const grantPoolResource = useCallback(
    async (resourceType: LiveGameResourceType) => {
      recordLiveGameDiagnostic("gameplay", "host_grant_pool_click", {
        resourceType,
        amount: HOST_GRANT_POOL_AMOUNT,
      });
      const response = await diagnosticFetch(
        "/api/live-game/control",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId: toRoomId(session.joinCode),
            action: "grant_pool",
            resourceType,
          }),
        },
        {
          phase: "gameplay",
          name: "host_grant_pool",
          detail: { resourceType, amount: HOST_GRANT_POOL_AMOUNT },
        },
      );
      const payload = (await response.json()) as {
        error?: string;
        poolCount?: number;
        amount?: number;
      };
      if (!response.ok) throw new Error(payload.error ?? "Could not add resources.");
      return payload;
    },
    [session.joinCode],
  );

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
    grantPoolResource,
  };
}

export function useLiveGameSessionPhase() {
  return useStorage((root) => readLiveGameStorageSnapshot(root).session.phase);
}
