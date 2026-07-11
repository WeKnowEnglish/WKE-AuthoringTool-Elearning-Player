"use client";

import { useEffect, useRef } from "react";
import type { LiveGameSessionContext } from "@/lib/live-game/liveblocks/identity";
import { useLiveGameLobby } from "@/lib/live-game/liveblocks/use-live-game-lobby";

export function useAutoJoinLiveGameLobby(context: LiveGameSessionContext) {
  const { joinLobby, selfEntry } = useLiveGameLobby();
  const joinedRef = useRef(false);

  useEffect(() => {
    if (joinedRef.current || selfEntry) return;
    joinedRef.current = true;
    joinLobby({
      name: context.displayName,
      color: context.color,
      role: context.role,
      avatarId: context.avatarId,
    });
  }, [
    context.avatarId,
    context.color,
    context.displayName,
    context.role,
    joinLobby,
    selfEntry,
  ]);
}
