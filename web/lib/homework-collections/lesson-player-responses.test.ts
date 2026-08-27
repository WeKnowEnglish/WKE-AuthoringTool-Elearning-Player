import { describe, expect, it } from "vitest";
import {
  appendGradedActivityAttempt,
  buildGradedActivityRunResult,
} from "@/lib/graded-activities";
import {
  createHomeworkCollectionPart,
  scoreHomeworkCollectionLessonPlayerRun,
} from "@/lib/homework-collections";

describe("Lesson Player homework collection adapter", () => {
  it("server-scores the first MC response instead of trusting pass flags", () => {
    const part = createHomeworkCollectionPart("multiple_choice", "beat-mc");
    if (part.kind !== "multiple_choice") throw new Error("Expected MC");
    const question = part.questions[0]!;
    question.id = "question-one";
    question.correctOptionId = question.options[0]!.id;
    const wrongOptionId = question.options[1]!.id;
    const screen = {
      screenId: "screen-one",
      screenType: "interaction",
      payload: {
        subtype: "mc_quiz",
        grading_part_id: part.id,
        grading_item_id: question.id,
      },
    };
    const wrong = appendGradedActivityAttempt({
      lessonId: "homework-one",
      screen,
      response: wrongOptionId,
      passed: true,
      occurredAt: "2026-08-25T00:00:00.000Z",
    });
    const corrected = appendGradedActivityAttempt({
      lessonId: "homework-one",
      screen,
      current: wrong.outcome,
      response: question.correctOptionId,
      passed: true,
      occurredAt: "2026-08-25T00:00:01.000Z",
    });
    const run = buildGradedActivityRunResult({
      lessonId: "homework-one",
      outcomes: { "screen-one": corrected.outcome },
    });

    const scored = scoreHomeworkCollectionLessonPlayerRun(
      { version: 1, parts: [part] },
      run,
    );
    expect(scored.parts[part.id]).toMatchObject({
      answers: { [question.id]: wrongOptionId },
      correct: 0,
      maxScore: 1,
    });
  });
});
