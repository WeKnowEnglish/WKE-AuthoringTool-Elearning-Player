import type { SpeakSyllableMode } from "@/lib/audio/speak-syllables";

export const SECONDARY_SYLLABLE_SPEECH_MODE_PREFIX = "secondary-syllable-speech-mode-v1:";

function storageKey(studentId: string): string {
  return `${SECONDARY_SYLLABLE_SPEECH_MODE_PREFIX}${studentId}`;
}

export function readSecondarySyllableSpeechMode(studentId: string): SpeakSyllableMode {
  if (!studentId) return "normal";
  try {
    const raw = localStorage.getItem(storageKey(studentId));
    return raw === "slow" ? "slow" : "normal";
  } catch {
    return "normal";
  }
}

export function writeSecondarySyllableSpeechMode(
  studentId: string,
  mode: SpeakSyllableMode,
): void {
  if (!studentId) return;
  try {
    localStorage.setItem(storageKey(studentId), mode);
  } catch {
    // ignore quota
  }
}

export function isSecondarySyllableSpeechMode(value: string): value is SpeakSyllableMode {
  return value === "normal" || value === "slow";
}
