"use client";

import { useOthers, useSelf, useStorage } from "@liveblocks/react/suspense";
import type { LiveGameLobbyPlayer, LiveGameStorageSnapshot } from "@/lib/live-game/liveblocks/config";
import {
  useCloseLiveGameLobbyMutation,
  useEndRoundAndReturnToLobbyMutation,
  useJoinLiveGameLobbyMutation,
  useReturnToLobbyMutation,
  useStartLiveGameMutation,
} from "@/lib/live-game/liveblocks/mutations/lobby";

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

  const joinLobby = useJoinLiveGameLobbyMutation();
  const startGame = useStartLiveGameMutation();
  const returnToLobby = useReturnToLobbyMutation();
  const closeLobby = useCloseLiveGameLobbyMutation();
  const endRoundAndReturnToLobby = useEndRoundAndReturnToLobbyMutation();

  const selfEntry = players.find((entry) => entry.id === self.id) ?? null;
  const isHost = selfEntry?.player.role === "host";

  return {
    self,
    others,
    session,
    players,
    selfEntry,
    isHost,
    joinLobby,
    startGame,
    returnToLobby,
    closeLobby,
    endRoundAndReturnToLobby,
  };
}

export function useLiveGameSessionPhase() {
  return useStorage((root) => readLiveGameStorageSnapshot(root).session.phase);
}
