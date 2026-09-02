"use client";

import { useCallback, useEffect, useRef } from "react";

import { speakText, stopSpeaking } from "./tts";

type UseSingleChannelLessonAudioOptions = {
  enabled?: boolean;
  language?: string;
  onPlayingChange?: (playing: boolean) => void;
};

/**
 * Keeps authored audio and browser speech on one interruptible channel.
 * A newer line always wins, including over delayed browser-TTS fallbacks.
 */
export function useSingleChannelLessonAudio({
  enabled = true,
  language = "en-GB",
  onPlayingChange,
}: UseSingleChannelLessonAudioOptions = {}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const finishTimerRef = useRef<number | null>(null);
  const generationRef = useRef(0);

  const stop = useCallback(() => {
    generationRef.current += 1;
    audioRef.current?.pause();
    audioRef.current = null;
    if (finishTimerRef.current !== null) {
      window.clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }
    stopSpeaking();
    onPlayingChange?.(false);
  }, [onPlayingChange]);

  const play = useCallback((text: string, rate = 0.88, audioUrl?: string, playbackRate = 1) => {
    if (!enabled) {
      stop();
      return;
    }

    const generation = ++generationRef.current;
    audioRef.current?.pause();
    audioRef.current = null;
    stopSpeaking();
    if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
    onPlayingChange?.(true);

    const finish = () => {
      if (generation !== generationRef.current) return;
      audioRef.current = null;
      finishTimerRef.current = null;
      onPlayingChange?.(false);
    };

    if (!audioUrl) {
      speakText(text, { lang: language, rate });
      finishTimerRef.current = window.setTimeout(
        finish,
        Math.min(4500, Math.max(1200, text.length * 55)),
      );
      return;
    }

    const audio = new Audio(audioUrl);
    audio.playbackRate = playbackRate;
    audio.preservesPitch = playbackRate === 1;
    audioRef.current = audio;
    audio.onended = finish;

    let fallbackStarted = false;
    const startFallback = () => {
      if (fallbackStarted || generation !== generationRef.current) return;
      fallbackStarted = true;
      audioRef.current = null;
      speakText(text, { lang: language, rate });
      finishTimerRef.current = window.setTimeout(
        finish,
        Math.min(4500, Math.max(1200, text.length * 55)),
      );
    };
    audio.onerror = startFallback;
    void audio.play().catch(startFallback);
  }, [enabled, language, onPlayingChange, stop]);

  useEffect(() => stop, [stop]);

  return { play, stop };
}
