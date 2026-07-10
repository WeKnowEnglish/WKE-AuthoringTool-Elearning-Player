import { describe, expect, it, vi } from "vitest";
import {
  readSecondarySyllableSpeechMode,
  SECONDARY_SYLLABLE_SPEECH_MODE_PREFIX,
  writeSecondarySyllableSpeechMode,
} from "@/lib/secondary/secondary-syllable-speech-preference";

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

describe("secondary-syllable-speech-preference", () => {
  it("defaults to normal when unset", () => {
    const localStorage = createMemoryStorage();
    vi.stubGlobal("localStorage", localStorage);
    expect(readSecondarySyllableSpeechMode("student-1")).toBe("normal");
    vi.unstubAllGlobals();
  });

  it("persists slow mode per student", () => {
    const localStorage = createMemoryStorage();
    vi.stubGlobal("localStorage", localStorage);
    writeSecondarySyllableSpeechMode("student-1", "slow");
    expect(localStorage.getItem(`${SECONDARY_SYLLABLE_SPEECH_MODE_PREFIX}student-1`)).toBe("slow");
    expect(readSecondarySyllableSpeechMode("student-1")).toBe("slow");
    expect(readSecondarySyllableSpeechMode("student-2")).toBe("normal");
    vi.unstubAllGlobals();
  });
});
