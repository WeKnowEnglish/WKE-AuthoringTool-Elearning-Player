"use client";

import { useOthers, useSelf, useStorage } from "@liveblocks/react/suspense";
import {
  useJoinLobbyMutation,
  useSetReadyMutation,
  useStartLobbyMutation,
} from "@/lib/board-game/liveblocks/mutations/lobby";
import type { LobbyPlayer } from "@/liveblocks.config";

export type LobbyPlayerEntry = {
  id: string;
  player: LobbyPlayer;
};

export function useBoardGameLobby() {
  const self = useSelf();
  const others = useOthers();
  const lobby = useStorage((root) => root.lobby);
  const players = useStorage((root) => {
    const entries: LobbyPlayerEntry[] = [];
    const playersMap = root.players as unknown as Map<string, LobbyPlayer>;
    for (const [id, player] of playersMap.entries()) {
      entries.push({ id, player });
    }
    entries.sort((a, b) => a.player.joinedAt - b.player.joinedAt);
    return entries;
  });

  const joinLobby = useJoinLobbyMutation();
  const setReady = useSetReadyMutation();
  const startLobby = useStartLobbyMutation();

  const selfEntry = players.find((entry) => entry.id === self.id) ?? null;
  const namedPlayerCount = players.filter((entry) => entry.player.name.trim().length > 0).length;
  const isHost = selfEntry?.player.role === "host";

  return {
    self,
    others,
    lobby,
    players,
    selfEntry,
    namedPlayerCount,
    isHost,
    joinLobby,
    setReady,
    startLobby,
  };
}
