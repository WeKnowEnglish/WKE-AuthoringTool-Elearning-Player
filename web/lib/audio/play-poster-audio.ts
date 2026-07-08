"use client";

import { speakText } from "./tts";

export function playPosterAudio(
  text: string,
  opts?: { lang?: string; muted?: boolean },
): boolean {
  return speakText(text, { lang: opts?.lang, muted: opts?.muted });
}
