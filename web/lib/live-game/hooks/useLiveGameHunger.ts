"use client";

import { useEffect, useState } from "react";
import {
  isPlayerHungerLow,
  isPlayerStarving,
  reconcilePlayerHunger,
} from "@/lib/live-game/modes/english-craft/hunger";
import { useLiveGameSelfHunger } from "@/lib/live-game/hooks/useLiveGameGameplay";

type Options = {
  playing: boolean;
};

export function useLiveGameSelfHungerDisplay({ playing }: Options) {
  const storedHunger = useLiveGameSelfHunger();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(id);
  }, [playing]);

  const hunger = reconcilePlayerHunger(storedHunger, now, playing);

  return {
    value: hunger.value,
    isLow: isPlayerHungerLow(storedHunger, now, playing),
    isStarving: isPlayerStarving(storedHunger, now, playing),
  };
}
