"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useUpdateMyPresence } from "@liveblocks/react/suspense";
import {
  collectTakenLiveGameAvatarIds,
  isLiveGameAvatarTaken,
} from "@/lib/live-game/characters/avatar-availability";
import {
  toLiveGameCharacterId,
  type LiveGameCharacterId,
} from "@/lib/live-game/characters/live-game-characters";
import {
  setLiveGameSessionContext,
  type LiveGameSessionContext,
} from "@/lib/live-game/liveblocks/identity";
import { useUpdateLiveGameAvatarMutation } from "@/lib/live-game/liveblocks/mutations/lobby";
import { useLiveGameLobby } from "@/lib/live-game/liveblocks/use-live-game-lobby";

export function useLiveGameAvatar(context: LiveGameSessionContext) {
  const { selfEntry, session, players, self } = useLiveGameLobby();
  const updateAvatar = useUpdateLiveGameAvatarMutation();
  const updatePresence = useUpdateMyPresence();

  const avatarId = useMemo(
    () => toLiveGameCharacterId(selfEntry?.player.avatarId ?? context.avatarId),
    [context.avatarId, selfEntry?.player.avatarId],
  );

  const takenAvatarIds = useMemo(
    () =>
      collectTakenLiveGameAvatarIds(
        players.map((entry) => ({ id: entry.id, avatarId: entry.player.avatarId })),
        self.id,
      ),
    [players, self.id],
  );

  const canChangeAvatar = session.phase === "lobby" && selfEntry != null;

  useEffect(() => {
    if (!selfEntry) return;
    const resolved = toLiveGameCharacterId(selfEntry.player.avatarId);
    if (resolved === toLiveGameCharacterId(context.avatarId)) return;
    setLiveGameSessionContext({ ...context, avatarId: resolved });
    updatePresence({ avatarId: resolved } as never);
  }, [selfEntry?.player.avatarId, context.avatarId, context, updatePresence]);

  const setAvatarId = useCallback(
    (nextId: LiveGameCharacterId) => {
      if (!canChangeAvatar) return;

      const resolved = toLiveGameCharacterId(nextId);
      if (isLiveGameAvatarTaken(takenAvatarIds, resolved)) return;

      updateAvatar(resolved);
      setLiveGameSessionContext({ ...context, avatarId: resolved });
      updatePresence({ avatarId: resolved } as never);
    },
    [canChangeAvatar, context, takenAvatarIds, updateAvatar, updatePresence],
  );

  return {
    avatarId,
    setAvatarId,
    canChangeAvatar,
    takenAvatarIds,
  };
}
