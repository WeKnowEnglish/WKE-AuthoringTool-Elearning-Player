"use client";

import { useEffect, useRef, useState } from "react";
import {
  BOAT_BOARDING_DWELL_MS,
  countPlayersOnBoat,
  isBoatBoardingDwellComplete,
  isPlayerInBoatBoardingZone,
  updateBoatBoardingDwell,
} from "@/lib/live-game/engine/boat-boarding";
import { ENGLISH_CRAFT_BOAT_BOARDING_ZONE_V1 } from "@/lib/live-game/modes/english-craft/map-objects-v1";
import { diagnosticFetch, recordLiveGameDiagnostic } from "@/lib/live-game/diagnostics/client";

const BOARDING_POLL_MS = 250;

type ConnectedPlayer = {
  id: string;
  x: number;
  y: number;
};

type Options = {
  roomId: string;
  enabled: boolean;
  connectedPlayers: ConnectedPlayer[];
  onBeforeComplete?: () => Promise<void>;
  onSyncPosition?: () => Promise<void>;
};

export function useLiveGameBoatBoarding({
  roomId,
  enabled,
  connectedPlayers,
  onBeforeComplete,
  onSyncPosition,
}: Options) {
  const [dwellMs, setDwellMs] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const dwellRef = useRef(0);
  const completedRef = useRef(false);
  const inFlightRef = useRef(false);
  const lastTickRef = useRef<number | null>(null);

  const totalPlayers = connectedPlayers.length;
  const onBoatCount = countPlayersOnBoat(connectedPlayers, ENGLISH_CRAFT_BOAT_BOARDING_ZONE_V1);
  const dwellProgress = Math.min(1, dwellMs / BOAT_BOARDING_DWELL_MS);
  const allOnBoat = totalPlayers > 0 && onBoatCount === totalPlayers;
  const isLocalOnBoat = connectedPlayers.some((player) =>
    isPlayerInBoatBoardingZone(player.x, player.y, ENGLISH_CRAFT_BOAT_BOARDING_ZONE_V1),
  );

  useEffect(() => {
    if (!enabled || !isLocalOnBoat || !onSyncPosition) return;
    void onSyncPosition();
    const id = window.setInterval(() => {
      void onSyncPosition();
    }, 1_000);
    return () => window.clearInterval(id);
  }, [enabled, isLocalOnBoat, onSyncPosition]);

  useEffect(() => {
    if (!enabled) {
      dwellRef.current = 0;
      lastTickRef.current = null;
      queueMicrotask(() => setDwellMs(0));
      return;
    }

    const tick = () => {
      const now = performance.now();
      const elapsed = lastTickRef.current == null ? 0 : now - lastTickRef.current;
      lastTickRef.current = now;

      const nextDwell = updateBoatBoardingDwell(
        dwellRef.current,
        onBoatCount,
        totalPlayers,
        elapsed,
      );
      dwellRef.current = nextDwell;
      setDwellMs(nextDwell);

      if (
        !completedRef.current &&
        !inFlightRef.current &&
        isBoatBoardingDwellComplete(nextDwell)
      ) {
        inFlightRef.current = true;
        setIsCompleting(true);
        void (async () => {
          try {
            await onBeforeComplete?.();
            recordLiveGameDiagnostic("exit", "objective_completion_started", { roomId });
            const response = await diagnosticFetch("/api/live-game/complete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ roomId, kind: "boat_escape" }),
            }, { phase: "exit", name: "objective_completion_request", detail: { roomId } });
            if (response.ok) {
              completedRef.current = true;
            }
          } finally {
            inFlightRef.current = false;
            setIsCompleting(false);
          }
        })();
      }
    };

    tick();
    const id = window.setInterval(tick, BOARDING_POLL_MS);
    return () => window.clearInterval(id);
  }, [enabled, onBeforeComplete, onBoatCount, roomId, totalPlayers]);

  useEffect(() => {
    if (!enabled) {
      completedRef.current = false;
    }
  }, [enabled]);

  return {
    onBoatCount,
    totalPlayers,
    dwellProgress,
    allOnBoat,
    isCompleting,
    isLocalOnBoat,
  };
}
