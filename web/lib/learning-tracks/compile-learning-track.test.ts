import { describe, expect, it } from "vitest";
import { compileLearningTrack } from "@/lib/learning-tracks/compile-learning-track";
import {
  createBeatInstance,
  DEFAULT_FILL_BLANKS_BODY,
  DEFAULT_LINE_MATCH_BODY,
  DEFAULT_SENTENCE_SCRAMBLE_BODY,
  defaultFillBlanksSettings,
  defaultLetterMixupSettings,
  defaultLineMatchSettings,
  defaultListeningItemMatchSettings,
  defaultMultipleChoiceSettings,
  defaultSentenceScrambleSettings,
  defaultTrueFalseSettings,
} from "@/lib/learning-tracks/composition";
import { HOBBIES_DAY_1_COMPOSITION } from "@/lib/learning-tracks/compositions/hobbies-day-1";
import { parseLearningTrackLessonPlayerPack } from "@/lib/learning-tracks/parse-track-pack";
import { resolveBeatScreensSync } from "@/lib/learning-tracks/resolve-beat-screens";
import type { LearningTrackComposition } from "@/lib/learning-tracks/composition-types";
import { HOBBIES_DEFAULT_VOCAB_LIST_ID } from "@/lib/learning-tracks/composition-types";
import { parseScreenPayload } from "@/lib/lesson-schemas";

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

describe("LTC presentation activity", () => {
  it("creates an inline deck and compiles it into a playable slide story", () => {
    const beat = createBeatInstance("presentation", {
      id: "beat-presentation",
      label: "How to ask politely",
      presentation: {
        presentationDeck: {
          autoPlayNarration: true,
          autoAdvanceOnPass: false,
          slides: [
            {
              id: "slide-one",
              title: "Use please",
              bodyText: "Say please when you ask for something.",
              backgroundImageUrl: "/media/polite-request.png",
              backgroundColor: "#fef3c7",
              imageFit: "contain",
            },
            {
              id: "slide-two",
              title: "Try it",
              bodyText: "Legacy text is ignored once editable elements exist.",
              backgroundColor: "#eff6ff",
              imageFit: "cover",
              elements: [
                {
                  id: "movable-text",
                  kind: "text",
                  text: "Can I have the blue pencil, please?",
                  textColor: "#1e3a8a",
                  textSizePx: 32,
                  showCard: false,
                  xPercent: 14,
                  yPercent: 18,
                  widthPercent: 72,
                  heightPercent: 24,
                  zIndex: 2,
                },
                {
                  id: "blue-circle",
                  kind: "shape",
                  shape: "ellipse",
                  fillColor: "#60a5fa",
                  xPercent: 38,
                  yPercent: 50,
                  widthPercent: 24,
                  heightPercent: 30,
                  zIndex: 1,
                },
              ],
            },
          ],
        },
      },
    });

    expect(beat.source).toEqual({ type: "inline" });
    const screens = resolveBeatScreensSync(beat);
    expect(screens).toHaveLength(1);
    expect(screens[0]).toMatchObject({
      type: "interaction",
      subtype: "presentation_interactive",
      pass_rule: "visit_all_slides",
      auto_advance_on_pass: false,
    });

    const parsed = parseScreenPayload("interaction", screens[0]);
    expect(parsed?.type).toBe("story");
    expect(parsed && "layout_mode" in parsed ? parsed.layout_mode : null).toBe("slide");
    expect(parsed && "pages" in parsed ? parsed.pages : []).toHaveLength(2);
    expect(
      parsed && "pages" in parsed ? parsed.pages?.[0]?.read_aloud_text : null,
    ).toContain("Say please");
    expect(
      parsed && "pages" in parsed ? parsed.pages?.[0]?.auto_play_page_text : null,
    ).toBe(true);
    expect(
      parsed && "pages" in parsed
        ? parsed.pages?.[1]?.items.find((item) => item.id === "movable-text")
        : null,
    ).toMatchObject({
      kind: "text",
      text: "Can I have the blue pencil, please?",
      x_percent: 14,
      w_percent: 72,
      show_card: false,
    });
    expect(
      parsed && "pages" in parsed
        ? parsed.pages?.[1]?.items.find((item) => item.id === "blue-circle")
        : null,
    ).toMatchObject({
      kind: "shape",
      shape_variant: "ellipse",
      color_hex: "#60a5fa",
    });
  });

  it("rejects a completely empty presentation slide", () => {
    const beat = createBeatInstance("presentation", {
      id: "beat-empty-presentation",
      presentation: {
        presentationDeck: {
          autoPlayNarration: false,
          autoAdvanceOnPass: false,
          slides: [
            {
              id: "empty-slide",
              title: " ",
              bodyText: " ",
              backgroundColor: "#ffffff",
              imageFit: "cover",
            },
          ],
        },
      },
    });

    expect(() => resolveBeatScreensSync(beat)).toThrow(
      /slide 1 needs text, a shape, or an image/i,
    );
  });
});

describe("LTC listen and match activity", () => {
  it("creates five prompts, eight choices, and a playable interaction", () => {
    const defaults = defaultListeningItemMatchSettings();
    expect(defaults.prompts).toHaveLength(5);
    expect(defaults.choices).toHaveLength(8);

    const beat = createBeatInstance("listening_item_match", {
      id: "beat-listening-item-match",
      presentation: { listeningItemMatch: defaults },
    });
    expect(beat.source).toEqual({ type: "inline" });

    const screens = resolveBeatScreensSync(beat);
    expect(screens).toHaveLength(1);
    expect(screens[0]).toMatchObject({
      type: "interaction",
      subtype: "listening_item_match",
      shuffle_choices: true,
    });

    const parsed = parseScreenPayload("interaction", screens[0]);
    expect(parsed?.type).toBe("interaction");
    expect(parsed?.subtype).toBe("listening_item_match");
    if (parsed?.type === "interaction" && parsed.subtype === "listening_item_match") {
      expect(parsed.prompts).toHaveLength(5);
      expect(parsed.choices).toHaveLength(8);
      expect(
        new Set(parsed.prompts.map((prompt) => prompt.correct_choice_id)).size,
      ).toBe(5);
    }
  });

  it("rejects a task that does not leave exactly three distractors", () => {
    const settings = defaultListeningItemMatchSettings();
    settings.prompts[1]!.correctChoiceId = settings.prompts[0]!.correctChoiceId;
    const beat = createBeatInstance("listening_item_match", {
      id: "beat-invalid-listening-item-match",
      presentation: { listeningItemMatch: settings },
    });

    expect(() => resolveBeatScreensSync(beat)).toThrow(/three choices remain/i);
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

describe("LTC quiet-beat presentation (V1.4b)", () => {
  it("defaults autoAdvanceOnPass on and seeds body text for quiet beats", () => {
    expect(defaultLineMatchSettings().autoAdvanceOnPass).toBe(true);
    expect(defaultTrueFalseSettings().autoAdvanceOnPass).toBe(true);
    expect(defaultSentenceScrambleSettings().autoAdvanceOnPass).toBe(true);
    expect(defaultFillBlanksSettings().autoAdvanceOnPass).toBe(true);
    expect(defaultLineMatchSettings().bodyText).toBe(DEFAULT_LINE_MATCH_BODY);
    expect(defaultSentenceScrambleSettings().bodyText).toBe(
      DEFAULT_SENTENCE_SCRAMBLE_BODY,
    );
    expect(defaultFillBlanksSettings().bodyText).toBe(DEFAULT_FILL_BLANKS_BODY);

    expect(
      createBeatInstance("line_match").presentation?.lineMatch?.autoAdvanceOnPass,
    ).toBe(true);
    expect(
      createBeatInstance("true_false").presentation?.trueFalse?.autoAdvanceOnPass,
    ).toBe(true);
    expect(
      createBeatInstance("sentence_scramble").presentation?.sentenceScramble
        ?.autoAdvanceOnPass,
    ).toBe(true);
    expect(
      createBeatInstance("fill_blanks").presentation?.fillBlanks?.autoAdvanceOnPass,
    ).toBe(true);
  });

  it("stamps auto_advance_on_pass true on quiet-beat screens by default", () => {
    const composition: LearningTrackComposition = {
      version: 1,
      kind: "learning-track-composition",
      id: "test-quiet-auto-advance",
      packId: "pack",
      packTitle: "Pack",
      trackIndex: 1,
      title: "Quiet auto advance",
      aim: "Test",
      durationTargetMin: 10,
      beats: [
        createBeatInstance("line_match", { id: "beat-lm" }),
        createBeatInstance("true_false", { id: "beat-tf" }),
        createBeatInstance("sentence_scramble", { id: "beat-ss" }),
        createBeatInstance("fill_blanks", { id: "beat-fb" }),
      ],
    };

    const { pack } = compileLearningTrack(composition);
    const screens = pack.screens.filter((s) =>
      ["line_match", "true_false", "drag_sentence", "fill_blanks"].includes(
        s.subtype ?? "",
      ),
    );
    expect(screens.length).toBeGreaterThan(0);
    for (const screen of screens) {
      expect(screen.auto_advance_on_pass).toBe(true);
    }
  });

  it("stamps auto_advance_on_pass false when quiet-beat toggle is off", () => {
    const beat = createBeatInstance("true_false", {
      id: "beat-tf-off",
      presentation: {
        trueFalse: {
          ...defaultTrueFalseSettings(),
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

  it("applies custom body text on line match, scramble, and fill blanks", () => {
    const custom = "Custom quiet instruction.";
    const cases = [
      {
        beat: createBeatInstance("line_match", {
          id: "beat-lm-body",
          presentation: {
            lineMatch: { ...defaultLineMatchSettings(), bodyText: custom },
          },
        }),
        subtype: "line_match",
      },
      {
        beat: createBeatInstance("sentence_scramble", {
          id: "beat-ss-body",
          presentation: {
            sentenceScramble: {
              ...defaultSentenceScrambleSettings(),
              bodyText: custom,
            },
          },
        }),
        subtype: "drag_sentence",
      },
      {
        beat: createBeatInstance("fill_blanks", {
          id: "beat-fb-body",
          presentation: {
            fillBlanks: { ...defaultFillBlanksSettings(), bodyText: custom },
          },
        }),
        subtype: "fill_blanks",
      },
    ] as const;

    for (const { beat, subtype } of cases) {
      const screens = resolveBeatScreensSync(beat).filter(
        (s) => s.subtype === subtype,
      );
      expect(screens.length).toBeGreaterThan(0);
      for (const screen of screens) {
        expect(screen.body_text).toBe(custom);
      }
    }
  });
});
