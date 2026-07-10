import { describe, expect, it } from "vitest";
import {
  buildSyllableHighlightOffsetsMs,
  estimateWordSpeechDurationMs,
  getSyllableSpeechTiming,
  normalizeSpeakSyllables,
  SYLLABLE_SPEECH_RATES,
} from "@/lib/audio/speak-syllables";

describe("speak-syllables", () => {
  it("normalizes syllable parts", () => {
    expect(normalizeSpeakSyllables([" sub ", "", "ject"])).toEqual(["sub", "ject"]);
  });

  it("exposes normal and slow speech rates", () => {
    expect(getSyllableSpeechTiming("normal")).toEqual(SYLLABLE_SPEECH_RATES.normal);
    expect(getSyllableSpeechTiming("slow").rate).toBeLessThan(
      getSyllableSpeechTiming("normal").rate,
    );
  });

  it("estimates longer duration for slower speech", () => {
    const word = "subject";
    expect(estimateWordSpeechDurationMs(word, 0.62)).toBeGreaterThan(
      estimateWordSpeechDurationMs(word, 0.92),
    );
  });

  it("allocates highlight offsets by syllable length", () => {
    expect(buildSyllableHighlightOffsetsMs(["sub", "ject"], 700)).toEqual([
      0,
      (3 / 7) * 700,
    ]);
  });

  it("uses equal slots when syllable lengths are empty", () => {
    expect(buildSyllableHighlightOffsetsMs(["a", "b"], 400)).toEqual([0, 200]);
  });
});
