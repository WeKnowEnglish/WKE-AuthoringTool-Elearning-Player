"use client";

import { useCallback } from "react";
import {
  setLiveGameSessionContext,
  type LiveGameSessionContext,
} from "@/lib/live-game/liveblocks/identity";
import { useUpdateSessionDurationMutation } from "@/lib/live-game/liveblocks/mutations/lobby";
import { useLiveGameLobby } from "@/lib/live-game/liveblocks/use-live-game-lobby";
import type { EnglishCraftSessionDuration } from "@/lib/live-game/modes/english-craft/config";

export function useLiveGameSessionDuration(context: LiveGameSessionContext) {
  const { session, isHost } = useLiveGameLobby();
  const updateDuration = useUpdateSessionDurationMutation();

  const setDurationMinutes = useCallback(
    (duration: EnglishCraftSessionDuration) => {
      if (!isHost || session.phase !== "lobby") return;

      updateDuration(duration);
      setLiveGameSessionContext({ ...context, durationMinutes: duration });
    },
    [context, isHost, session.phase, updateDuration],
  );

  return {
    durationMinutes: session.durationMinutes,
    setDurationMinutes,
  };
}
