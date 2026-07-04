"use client";

import { useEffect } from "react";

/** Refreshes garden UI while the room is visible; growth math uses stored timestamps. */
export function useGardenGrowthTicker(
  enabled: boolean,
  onTick: () => void,
  intervalMs = 1000,
) {
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(onTick, intervalMs);
    return () => clearInterval(id);
  }, [enabled, onTick, intervalMs]);
}
