import { describe, expect, it } from "vitest";
import { compileLearningTrack } from "@/lib/learning-tracks/compile-learning-track";
import {
  createBeatInstance,
  defaultLetterMixupSettings,
  defaultMultipleChoiceSettings,
} from "@/lib/learning-tracks/composition";
import { HOBBIES_DAY_1_COMPOSITION } from "@/lib/learning-tracks/compositions/hobbies-day-1";
import { parseLearningTrackLessonPlayerPack } from "@/lib/learning-tracks/parse-track-pack";
import { resolveBeatScreensSync } from "@/lib/learning-tracks/resolve-beat-screens";
import type { LearningTrackComposition } from "@/lib/learning-tracks/composition-types";
import { HOBBIES_DEFAULT_VOCAB_LIST_ID } from "@/lib/learning-tracks/composition-types";

describe("compileLearningTrack", () => {
  it("compiles hobbies Day 1 into a playable track pack", () => {
    const { pack, beatPlan } = compileLearningTrack(
      structuredClone(HOBBIES_DAY_1_COMPOSITION),
    );

    expect(pack.kind).toBe("lessonplayer-track-pack");
    expect(pack.screens.length).toBeGreaterThan(5);
    expect(beatPlan.length).toBe(HOBBIES_DAY_1_COMPOSITION.beats.length);

    const parsed = parseLearningTrackLessonPlayerPack(pack);
    expect(parsed.screens.length).toBe(pack.screens.length);
  });
});

describe("LTC auto-advance on pass (Phase A)", () => {
  it("defaults autoAdvanceOnPass on for MCQ and letter scramble", () => {
    expect(defaultMultipleChoiceSettings().autoAdvanceOnPass).toBe(true);
    expect(defaultLetterMixupSettings().autoAdvanceOnPass).toBe(true);

    const mcBeat = createBeatInstance("multiple_choice");
    const letterBeat = createBeatInstance("letter_mixup");
    expect(mcBeat.presentation?.multipleChoice?.autoAdvanceOnPass).toBe(true);
    expect(letterBeat.presentation?.letterMixup?.autoAdvanceOnPass).toBe(true);
  });

  it("stamps auto_advance_on_pass true on compiled MCQ and letter screens by default", () => {
    const composition: LearningTrackComposition = {
      version: 1,
      kind: "learning-track-composition",
      id: "test-auto-advance",
      packId: "pack",
      packTitle: "Pack",
      trackIndex: 1,
      title: "Auto advance test",
      aim: "Test",
      durationTargetMin: 10,
      beats: [
        createBeatInstance("multiple_choice", { id: "beat-mc" }),
        createBeatInstance("letter_mixup", { id: "beat-letter" }),
      ],
    };

    const { pack } = compileLearningTrack(composition);
    const mcScreens = pack.screens.filter((s) => s.subtype === "mc_quiz");
    const letterScreens = pack.screens.filter((s) => s.subtype === "letter_mixup");
    expect(mcScreens.length).toBeGreaterThan(0);
    expect(letterScreens.length).toBeGreaterThan(0);
    for (const screen of [...mcScreens, ...letterScreens]) {
      expect(screen.auto_advance_on_pass).toBe(true);
    }
  });

  it("stamps auto_advance_on_pass false when the teacher turns the toggle off", () => {
    const beat = createBeatInstance("multiple_choice", {
      id: "beat-mc-off",
      presentation: {
        multipleChoice: {
          ...defaultMultipleChoiceSettings(),
          autoAdvanceOnPass: false,
        },
      },
    });
    const screens = resolveBeatScreensSync(beat);
    expect(screens.length).toBeGreaterThan(0);
    for (const screen of screens) {
      expect(screen.auto_advance_on_pass).toBe(false);
    }
  });

  it("does not auto-advance flashcards by default", () => {
    const beat = createBeatInstance("flashcards", {
      id: "beat-fc",
      source: {
        type: "vocab_compile",
        listId: HOBBIES_DEFAULT_VOCAB_LIST_ID,
        format: "flashcards",
      },
    });
    const screens = resolveBeatScreensSync(beat);
    expect(screens.length).toBeGreaterThan(0);
    for (const screen of screens) {
      expect(screen.auto_advance_on_pass).toBeUndefined();
    }
  });
});
