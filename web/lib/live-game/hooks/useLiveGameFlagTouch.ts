"use client";

import { useEffect, useRef } from "react";
import { isPlayerTouchingFlagZone } from "@/lib/live-game/engine/flag-touch";
import { ENGLISH_CRAFT_FLAG_ZONE_V1 } from "@/lib/live-game/modes/english-craft/map-objects-v1";

type Options = {
  roomId: string;
  playerX: number;
  playerY: number;
  enabled: boolean;
};

export function useLiveGameFlagTouch({
  roomId,
  playerX,
  playerY,
  enabled,
}: Options) {
  const inFlightRef = useRef(false);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!enabled || inFlightRef.current || completedRef.current) return;
    if (!isPlayerTouchingFlagZone(playerX, playerY, ENGLISH_CRAFT_FLAG_ZONE_V1)) return;

    inFlightRef.current = true;
    void (async () => {
      try {
        const positionResponse = await fetch("/api/live-game/position", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, x: playerX, y: playerY }),
        });
        if (!positionResponse.ok) return;
        const response = await fetch("/api/live-game/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId }),
        });
        if (response.ok) {
          completedRef.current = true;
        }
      } finally {
        inFlightRef.current = false;
      }
    })();
  }, [enabled, playerX, playerY, roomId]);
}
