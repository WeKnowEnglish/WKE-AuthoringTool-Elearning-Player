import { describe, expect, it } from "vitest";
import {
  createHomeworkCollectionPart,
} from "@/lib/homework-collections";
import {
  appendGradedActivityAttempt,
  buildGradedActivityRunResult,
  buildGradedTrackManifest,
} from "@/lib/graded-activities";
import { seedBlankGradedCollection } from "@/lib/activity-tracks";

describe("graded activity contracts", () => {
  it("freezes stable multiple-choice item ids without exposing answers", () => {
    const doc = seedBlankGradedCollection({
      trackId: "track-graded-contract",
      title: "Vocabulary check",
      level: "primary",
    });
    const part = createHomeworkCollectionPart("multiple_choice", "part-mc");
    if (part.kind !== "multiple_choice") throw new Error("Expected MC");
    part.questions[0]!.id = "question-one";
    doc.parts = [{
      id: part.id,
      order: 1,
      kind: "multiple_choice",
      label: "Choose the answer",
      source: { type: "homework_part", part },
    }];

    expect(buildGradedTrackManifest(doc)).toEqual({
      version: 1,
      trackId: doc.id,
      parts: [{
        partId: "part-mc",
        label: "Choose the answer",
        format: "multiple_choice",
        contentVersion: 1,
        gradingPolicy: "automatic",
        required: true,
        maxScore: 1,
        items: [{ itemId: "question-one", required: true, maxScore: 1 }],
      }],
    });
  });

  it("preserves the first selected MC option and retry history", () => {
    const screen = {
      screenId: "screen-row-1",
      screenType: "interaction",
      payload: {
        subtype: "mc_quiz",
        grading_part_id: "beat-vocab",
        grading_item_id: "question-apple",
      },
    };
    const first = appendGradedActivityAttempt({
      lessonId: "lesson-1",
      screen,
      response: "option-b",
      passed: false,
      occurredAt: "2026-08-25T00:00:00.000Z",
    });
    const second = appendGradedActivityAttempt({
      lessonId: "lesson-1",
      screen,
      current: first.outcome,
      response: "option-a",
      passed: true,
      occurredAt: "2026-08-25T00:00:01.000Z",
    });

    expect(second.outcome).toMatchObject({ passed: true, wrongAttempts: 1 });
    expect(second.outcome.attempts?.map((attempt) => attempt.response)).toEqual([
      "option-b",
      "option-a",
    ]);
    expect(buildGradedActivityRunResult({
      lessonId: "lesson-1",
      outcomes: { "screen-row-1": second.outcome },
      completedAt: "2026-08-25T00:00:02.000Z",
    }).summary).toEqual({
      itemCount: 1,
      completedCount: 1,
      firstTryCorrect: 0,
      retries: 1,
    });
  });
});
