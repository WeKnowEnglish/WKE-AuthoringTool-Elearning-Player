"use client";

import { LiveObject } from "@liveblocks/client";
import { useMutation } from "@liveblocks/react/suspense";
import type { LiveGameAuthRole } from "@/lib/live-game/liveblocks/auth-policy";
import type { LiveGameSessionState } from "@/lib/live-game/liveblocks/config";
import { createEnglishCraftResourceNodes } from "@/lib/live-game/liveblocks/initial-storage";

export function useJoinLiveGameLobbyMutation() {
  return useMutation(
    (
      { storage, self },
      input: {
        name: string;
        color: string;
        role: LiveGameAuthRole;
        avatarId: string;
      },
    ) => {
      const players = storage.get("players");
      if (!players) return;
      if (players.get(self.id)) return;

      players.set(
        self.id,
        new LiveObject({
          name: input.name,
          color: input.color,
          role: input.role,
          isReady: input.role === "host",
          joinedAt: Date.now(),
          avatarId: input.avatarId,
        }),
      );
    },
    [],
  );
}

export function useSetLiveGameReadyMutation() {
  return useMutation(({ storage, self }, isReady: boolean) => {
    const players = storage.get("players");
    if (!players) return;
    const player = players.get(self.id);
    if (!player) return;
    player.set("isReady", isReady);
  }, []);
}

export function useStartLiveGameMutation() {
  return useMutation(({ storage }) => {
    const session = storage.get("session" as never) as LiveObject<LiveGameSessionState> | undefined;
    if (!session) return;
    const durationMinutes = session.get("durationMinutes");
    session.set("phase", "playing");
    session.set("endsAt", Date.now() + durationMinutes * 60 * 1000);

    const resourcePool = storage.get("resourcePool" as never) as
      | LiveObject<{ wood: number }>
      | undefined;
    if (resourcePool) {
      resourcePool.set("wood", 0);
    } else {
      storage.set("resourcePool" as never, new LiveObject({ wood: 0 }) as never);
    }

    const freshNodes = createEnglishCraftResourceNodes();
    storage.set("resourceNodes" as never, freshNodes as never);
  }, []);
}
