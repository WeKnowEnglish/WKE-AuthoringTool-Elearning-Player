"use client";

import { LiveObject } from "@liveblocks/client";
import { useMutation } from "@liveblocks/react/suspense";
import type { LiveblocksAuthRole } from "@/lib/board-game/liveblocks/auth-policy";

export function useJoinLobbyMutation() {
  return useMutation(
    (
      { storage, self },
      input: { name: string; color: string; role: LiveblocksAuthRole },
    ) => {
      const players = storage.get("players");
      if (players.get(self.id)) return;

      players.set(
        self.id,
        new LiveObject({
          name: input.name,
          color: input.color,
          role: input.role,
          isReady: input.role === "host",
          joinedAt: Date.now(),
        }),
      );
    },
    [],
  );
}

export function useSetReadyMutation() {
  return useMutation(({ storage, self }, isReady: boolean) => {
    const player = storage.get("players").get(self.id);
    if (!player) return;
    player.set("isReady", isReady);
  }, []);
}

export function useStartLobbyMutation() {
  return useMutation(({ storage }) => {
    const lobby = storage.get("lobby");
    lobby.set("phase", "starting");
  }, []);
}
