import { describe, expect, it } from "vitest";
import type { LessonScreenRow } from "@/lib/data/catalog";
import {
  getLessonLanguageQualityIssues,
  getLessonPublishBlockingReasons,
  lessonPublishChecklist,
} from "@/lib/lesson-editor-checklist";

function screen(
  order_index: number,
  screen_type: string,
  payload: unknown,
): LessonScreenRow {
  return {
    id: `screen-${order_index}`,
    lesson_id: "lesson-1",
    order_index,
    screen_type,
    payload,
  };
}

const validStart = screen(0, "start", {
  type: "start",
  cta_label: "Start learning",
});

describe("lesson editor ESL language checklist", () => {
  it("collects language-quality issues from manually authored screens", () => {
    const issues = getLessonLanguageQualityIssues([
      validStart,
      screen(1, "interaction", {
        type: "interaction",
        subtype: "true_false",
        statement: "This is an eggs.",
        correct: false,
        picture_truth_statement: "We eat milk for breakfast.",
      }),
    ]);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          orderIndex: 1,
          screenType: "interaction",
          severity: "error",
          code: "broken_article_noun_agreement",
        }),
        expect.objectContaining({
          orderIndex: 1,
          screenType: "interaction",
          severity: "error",
          code: "wrong_meal_verb",
        }),
      ]),
    );
  });

  it("blocks publishing when student-facing language has grammar errors", () => {
    const screens = [
      validStart,
      screen(1, "interaction", {
        type: "interaction",
        subtype: "true_false",
        statement: "This is an eggs.",
        correct: false,
        picture_truth_statement: "These are eggs.",
      }),
    ];

    const reasons = getLessonPublishBlockingReasons(screens);
    expect(reasons).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Fix student-facing ESL language errors before publishing"),
      ]),
    );

    const checklist = lessonPublishChecklist({ published: false, screens });
    expect(checklist).toContainEqual({
      ok: false,
      label: "Student-facing ESL language has no blocking grammar errors",
    });
  });

  it("does not block publishing for language warnings only", () => {
    const screens = [
      validStart,
      screen(1, "interaction", {
        type: "interaction",
        subtype: "short_answer",
        prompt: "Write one word",
        acceptable_answers: ["apple"],
      }),
    ];

    expect(getLessonLanguageQualityIssues(screens)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "warning",
          code: "missing_sentence_punctuation",
        }),
      ]),
    );
    expect(getLessonPublishBlockingReasons(screens)).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining("Fix student-facing ESL language errors before publishing"),
      ]),
    );
  });
});
