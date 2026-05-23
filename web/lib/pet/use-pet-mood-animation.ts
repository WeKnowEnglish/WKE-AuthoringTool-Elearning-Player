"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PetMood } from "@/lib/pet/types";

export function usePetMoodAnimation(initial: PetMood = "normal") {
  const [mood, setMood] = useState<PetMood>(initial);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const bumpMood = useCallback((next: PetMood, durationMs?: number) => {
    setMood(next);
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    if (next !== "normal" && durationMs !== undefined && durationMs > 0) {
      resetTimerRef.current = setTimeout(() => {
        setMood("normal");
        resetTimerRef.current = null;
      }, durationMs);
    }
  }, []);

  return { mood, setMood, bumpMood };
}
