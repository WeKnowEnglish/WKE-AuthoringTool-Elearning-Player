"use client";

import { useEffect, useRef } from "react";
import type { LiveGameRoundEndReason } from "@/lib/live-game/liveblocks/config";

export function useLiveGameAutoTimeout(input: {
  enabled: boolean;
  isExpired: boolean;
  hasTimedSession: boolean;
  endsAt: number | null;
  onTimeout: (reason: LiveGameRoundEndReason) => void;
}) {
  const { enabled, isExpired, hasTimedSession, endsAt, onTimeout } = input;
  const firedRef = useRef(false);

  useEffect(() => {
    firedRef.current = false;
  }, [endsAt, hasTimedSession, enabled]);

  useEffect(() => {
    if (!enabled || !hasTimedSession || !isExpired || firedRef.current) return;
    firedRef.current = true;
    onTimeout("timeout");
  }, [enabled, hasTimedSession, isExpired, onTimeout]);
}
