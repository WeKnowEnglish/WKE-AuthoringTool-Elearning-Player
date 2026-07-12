"use client";

import { useEffect } from "react";
import { useUpdateMyPresence } from "@liveblocks/react/suspense";
import type { LiveGameResourceType } from "@/lib/live-game/liveblocks/config";

/** Mirror Storage carry on Presence so remote clients can render haul sprites. */
export function useLiveGameCarryPresence(carriedResourceType: LiveGameResourceType | null) {
  const updatePresence = useUpdateMyPresence();

  useEffect(() => {
    updatePresence({ carriedResourceType } as never);
  }, [carriedResourceType, updatePresence]);
}
