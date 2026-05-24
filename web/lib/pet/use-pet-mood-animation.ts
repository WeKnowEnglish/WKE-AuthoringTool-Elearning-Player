"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PetMood } from "@/lib/pet/types";

export function usePetMoodAnimation(baseline: PetMood = "normal") {
  const [mood, setMood] = useState<PetMood>(baseline);
  const baselineRef = useRef(baseline);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  baselineRef.current = baseline;

  useEffect(() => {
    if (!resetTimerRef.current) {
      setMood(baseline);
    }
  }, [baseline]);

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
    const base = baselineRef.current;
    if (next !== base && durationMs !== undefined && durationMs > 0) {
      resetTimerRef.current = setTimeout(() => {
        setMood(baselineRef.current);
        resetTimerRef.current = null;
      }, durationMs);
    }
  }, []);

  return { mood, setMood, bumpMood };
}
