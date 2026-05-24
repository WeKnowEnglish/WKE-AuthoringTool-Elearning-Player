"use client";

import { useCallback, useEffect, useState } from "react";
import { playSfx } from "@/lib/audio/sfx";
import {
  AUDIO_MUTED_CHANGED_EVENT,
  getProgressSnapshot,
  setAudioMuted,
} from "@/lib/progress/local-storage";

export function useAudioMuted() {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const sync = () => {
      setMuted(getProgressSnapshot().audioMuted === true);
    };
    queueMicrotask(sync);
    window.addEventListener(AUDIO_MUTED_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(AUDIO_MUTED_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggleMuted = useCallback(() => {
    const wasMuted = getProgressSnapshot().audioMuted === true;
    const next = !wasMuted;
    playSfx("tap", wasMuted);
    setAudioMuted(next);
    setMuted(next);
  }, []);

  return { muted, toggleMuted };
}
