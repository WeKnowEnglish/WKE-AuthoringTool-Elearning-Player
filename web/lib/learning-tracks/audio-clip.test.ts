import { describe, expect, it } from "vitest";
import { normalizeAudioClipUrl } from "@/lib/activity-builder/audio-clip";
import {
  applyPackLetterImageAudio,
  applyPackPromptAudio,
} from "@/lib/learning-tracks/resolve-beat-screens";
import type { LearningTrackScreenPayload } from "@/lib/learning-tracks/composition-types";

describe("AudioClipControls helpers", () => {
  it("normalizes clip URLs", () => {
    expect(normalizeAudioClipUrl("  https://cdn.example/a.webm  ")).toBe(
      "https://cdn.example/a.webm",
    );
    expect(normalizeAudioClipUrl("")).toBe("");
    expect(normalizeAudioClipUrl(undefined)).toBe("");
  });
});

describe("pack-wide LTC audio stamp (Phase B)", () => {
  it("fills missing MCQ prompt_audio_url from pack clip", () => {
    const screens: LearningTrackScreenPayload[] = [
      {
        type: "interaction",
        subtype: "mc_quiz",
        question: "What is this?",
        options: [],
        correct_option_id: "a",
      },
      {
        type: "interaction",
        subtype: "mc_quiz",
        question: "Find: cake",
        options: [],
        correct_option_id: "a",
        prompt_audio_url: "https://cdn.example/existing.webm",
      },
    ];
    const next = applyPackPromptAudio(screens, "https://cdn.example/pack.webm");
    expect(next[0]?.prompt_audio_url).toBe("https://cdn.example/pack.webm");
    expect(next[1]?.prompt_audio_url).toBe("https://cdn.example/existing.webm");
  });

  it("fills missing letter scramble image_audio_url and disables TTS", () => {
    const screens: LearningTrackScreenPayload[] = [
      {
        type: "interaction",
        subtype: "letter_mixup",
        prompt: "Spell",
        items: [{ id: "1", target_word: "bread" }],
        image_use_tts: true,
      },
    ];
    const next = applyPackLetterImageAudio(screens, "https://cdn.example/word.webm");
    expect(next[0]?.image_audio_url).toBe("https://cdn.example/word.webm");
    expect(next[0]?.image_use_tts).toBe(false);
  });

  it("no-ops when pack clip is empty", () => {
    const screens: LearningTrackScreenPayload[] = [
      { type: "interaction", subtype: "mc_quiz", question: "Q", options: [], correct_option_id: "a" },
    ];
    expect(applyPackPromptAudio(screens, "  ")).toEqual(screens);
    expect(applyPackLetterImageAudio(screens, undefined)).toEqual(screens);
  });
});
