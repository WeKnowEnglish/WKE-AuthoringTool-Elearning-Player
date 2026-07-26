import { describe, expect, it } from "vitest";
import {
  homeworkPayloadSummary,
  normalizeHomeworkPayload,
} from "@/lib/class-homework/normalize";

describe("class-homework/normalize", () => {
  it("normalizes pack quiz and rejects empty quiz id", () => {
    expect(normalizeHomeworkPayload({ type: "pack_quiz", quizId: "" })).toBeNull();
    const payload = normalizeHomeworkPayload({
      type: "pack_quiz",
      quizId: "q1",
      quizTitle: "Animals",
      questionCount: 4,
    });
    expect(payload).toEqual({
      type: "pack_quiz",
      quizId: "q1",
      quizTitle: "Animals",
      questionCount: 4,
    });
    expect(homeworkPayloadSummary(payload!)).toContain("Animals");
  });

  it("preserves frozen questions on pack quiz payloads", () => {
    const payload = normalizeHomeworkPayload({
      type: "pack_quiz",
      quizId: "q1",
      quizTitle: "Animals",
      questionCount: 99,
      frozenAt: "2026-01-01T00:00:00.000Z",
      questions: [
        {
          id: "a:find",
          wordId: "a",
          mode: "find_lemma",
          payload: {
            type: "interaction",
            subtype: "mc_quiz",
            question: "Find: cat",
            options: [
              { id: "a", label: "cat" },
              { id: "b", label: "dog" },
              { id: "c", label: "bird" },
              { id: "d", label: "fish" },
            ],
            correct_option_id: "a",
            shuffle_options: false,
            image_fit: "contain",
          },
        },
      ],
    });
    expect(payload?.type).toBe("pack_quiz");
    if (payload?.type !== "pack_quiz") return;
    expect(payload.questionCount).toBe(1);
    expect(payload.questions).toHaveLength(1);
    expect(payload.frozenAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("normalizes pack flashcards and rejects empty set id", () => {
    expect(normalizeHomeworkPayload({ type: "pack_flashcards", setId: "" })).toBeNull();
    const payload = normalizeHomeworkPayload({
      type: "pack_flashcards",
      setId: "s1",
      setTitle: "Pets cards",
      cardCount: 3,
    });
    expect(payload).toEqual({
      type: "pack_flashcards",
      setId: "s1",
      setTitle: "Pets cards",
      cardCount: 3,
    });
    expect(homeworkPayloadSummary(payload!)).toContain("Pets cards");
  });

  it("normalizes word pack practice and external notes", () => {
    const pack = normalizeHomeworkPayload({
      type: "word_pack_practice",
      packId: "p1",
      packTitle: "Food",
      wordCount: 8,
    });
    expect(pack?.type).toBe("word_pack_practice");

    expect(normalizeHomeworkPayload({ type: "external_note", body: "  " })).toBeNull();
    const note = normalizeHomeworkPayload({
      type: "external_note",
      body: "Finish page 12",
    });
    expect(note).toEqual({ type: "external_note", body: "Finish page 12" });
  });

  it("normalizes studio_activity and rejects incomplete packs", () => {
    expect(
      normalizeHomeworkPayload({
        type: "studio_activity",
        activityId: "",
        format: "multiple_choice",
        title: "Bakery",
        screenCount: 2,
        pack: { screens: [] },
        frozenAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toBeNull();
    expect(
      normalizeHomeworkPayload({
        type: "studio_activity",
        activityId: "a1",
        format: "learning_track",
        title: "Track",
        screenCount: 2,
        pack: { screens: [] },
        frozenAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toBeNull();
    expect(
      normalizeHomeworkPayload({
        type: "studio_activity",
        activityId: "a1",
        format: "multiple_choice",
        title: "Bakery",
        screenCount: 0,
        pack: { screens: [] },
        frozenAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toBeNull();

    const payload = normalizeHomeworkPayload({
      type: "studio_activity",
      activityId: "a1",
      format: "multiple_choice",
      title: "Bakery quiz",
      screenCount: 3,
      pack: { title: "Bakery", screens: [{ id: "s1" }] },
      frozenAt: "2026-01-01T00:00:00.000Z",
    });
    expect(payload).toEqual({
      type: "studio_activity",
      activityId: "a1",
      format: "multiple_choice",
      title: "Bakery quiz",
      screenCount: 3,
      pack: { title: "Bakery", screens: [{ id: "s1" }] },
      frozenAt: "2026-01-01T00:00:00.000Z",
    });
    expect(homeworkPayloadSummary(payload!)).toContain("Bakery quiz");
    expect(homeworkPayloadSummary(payload!)).toContain("3 screens");
  });
});
