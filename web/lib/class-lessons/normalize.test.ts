import { describe, expect, it } from "vitest";
import {
  normalizeClassLessonDuration,
  normalizeClassLessonStepInputs,
  normalizeDocumentStepConfig,
  normalizeLiveGameStepConfig,
  normalizeWhiteboardStepConfig,
  normalizeWordCardsStepConfig,
  stepTitleFromConfig,
} from "@/lib/class-lessons/normalize";
import { CLASS_LESSON_TEMPLATES } from "@/lib/class-lessons/templates";

describe("class-lessons/normalize", () => {
  it("normalizes whiteboard config with defaults", () => {
    const config = normalizeWhiteboardStepConfig({});
    expect(config.title).toBeTruthy();
    expect(config.timerMinutes).toBeGreaterThan(0);
    expect(["individual", "group", "teacher_demo"]).toContain(config.mode);
  });

  it("normalizes document and word cards configs", () => {
    const document = normalizeDocumentStepConfig({
      templateType: "dialogue",
      title: "  Pair talk  ",
      wordBank: ["hello", "bye"],
    });
    expect(document.templateType).toBe("dialogue");
    expect(document.title).toBe("Pair talk");
    expect(document.wordBank).toEqual(["hello", "bye"]);

    const cards = normalizeWordCardsStepConfig({
      wordList: ["cat", "dog"],
      participationMode: "group",
    });
    expect(cards.wordList).toEqual(["cat", "dog"]);
    expect(cards.participationMode).toBe("group");
  });

  it("drops live game steps without a question set", () => {
    const steps = normalizeClassLessonStepInputs([
      {
        kind: "live_game",
        title: "Game",
        config: { questionSetId: "", questionSetTitle: "Missing" },
      },
      {
        kind: "whiteboard",
        title: "Board",
        config: { title: "Draw" },
      },
    ]);
    expect(steps).toHaveLength(1);
    expect(steps[0]?.kind).toBe("whiteboard");
  });

  it("keeps live game steps with a question set id", () => {
    const config = normalizeLiveGameStepConfig({
      questionSetId: "qs-1",
      questionSetTitle: "Food A1",
      level: "A1",
    });
    expect(config.questionSetId).toBe("qs-1");
    expect(stepTitleFromConfig("live_game", config)).toBe("Food A1");
  });

  it("normalizes pedagogical fields on offline teaching steps", () => {
    const [step] = normalizeClassLessonStepInputs([
      {
        kind: "custom",
        title: " Pair interview ",
        phase: "communicative_practice",
        durationMinutes: 999,
        teacherAction: "  Monitor and note feedback. ",
        studentAction: "  Interview a partner. ",
        config: { materialNote: "Question cards" },
      },
    ]);

    expect(step).toMatchObject({
      kind: "custom",
      title: "Pair interview",
      phase: "communicative_practice",
      durationMinutes: 120,
      teacherAction: "Monitor and note feedback.",
      studentAction: "Interview a partner.",
      config: { materialNote: "Question cards" },
    });
  });

  it("keeps valid Activity Bank steps and drops incomplete references", () => {
    const steps = normalizeClassLessonStepInputs([
      {
        kind: "studio_activity",
        title: "Food quiz",
        config: {
          activityId: "9c3c3286-3af2-4dd4-a0d4-ac2f04fa2cab",
          activityTitle: "Food quiz",
          format: "multiple_choice",
          playPath: "/pilots/games/mc-quiz?activity=9c3c3286-3af2-4dd4-a0d4-ac2f04fa2cab",
        },
      },
      {
        kind: "studio_activity",
        title: "Missing",
        config: { activityId: "", playPath: "" },
      },
    ]);

    expect(steps).toHaveLength(1);
    expect(steps[0]?.kind).toBe("studio_activity");
  });

  it("ships concise templates whose step durations match their target", () => {
    expect(CLASS_LESSON_TEMPLATES).toHaveLength(4);
    const simple = CLASS_LESSON_TEMPLATES.find((template) => template.key === "simple_esl");
    expect(simple?.recommended).toBe(true);
    expect(
      simple?.steps.reduce((total, step) => total + (step.durationMinutes ?? 0), 0),
    ).toBe(simple?.durationMinutes);
    expect(simple?.steps.at(-1)?.phase).toBe("homework");
  });

  it("bounds total lesson duration", () => {
    expect(normalizeClassLessonDuration(1)).toBe(5);
    expect(normalizeClassLessonDuration(500)).toBe(240);
  });
});
