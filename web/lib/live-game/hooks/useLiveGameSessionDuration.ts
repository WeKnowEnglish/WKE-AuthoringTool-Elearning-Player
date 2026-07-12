"use client";

import { useCallback } from "react";
import {
  setLiveGameSessionContext,
  type LiveGameSessionContext,
} from "@/lib/live-game/liveblocks/identity";
import { useLiveGameLobby } from "@/lib/live-game/liveblocks/use-live-game-lobby";
import type { EnglishCraftSessionDuration } from "@/lib/live-game/modes/english-craft/config";
import { toRoomId } from "@/lib/live-game/liveblocks/room-id";

export function useLiveGameSessionDuration(context: LiveGameSessionContext) {
  const { session, isHost } = useLiveGameLobby();

  const setDurationMinutes = useCallback(
    (duration: EnglishCraftSessionDuration) => {
      if (!isHost || session.phase !== "lobby") return;

      void fetch("/api/live-game/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: toRoomId(context.sessionId),
          action: "set_duration",
          durationMinutes: duration,
        }),
      });
      setLiveGameSessionContext({ ...context, durationMinutes: duration });
    },
    [context, isHost, session.phase],
  );

  return {
    durationMinutes: session.durationMinutes,
    setDurationMinutes,
  };
}
