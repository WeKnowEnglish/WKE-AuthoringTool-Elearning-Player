import { describe, expect, it } from "vitest";
import { validateQuizPreviewBundle, type QuizPreviewSaveBundle } from "@/lib/quiz-preview-bundle";
import type { Question, QuizSession } from "@/types/quiz-builder-brain";

function makeQuestion(over: Partial<Question> & Pick<Question, "id" | "type">): Question {
  return {
    id: over.id,
    type: over.type,
    prompt: over.prompt ?? "p",
    correctAnswer: over.correctAnswer ?? "x",
    options: over.options ?? (over.type === "mcq" ? ["a", "b", "c"] : []),
    metadata: over.metadata ?? {
      structureId: "s1",
      vocabId: "v1",
      topic: "food",
      level: "A1",
    },
  };
}

describe("validateQuizPreviewBundle", () => {
  it("accepts aligned bundle", () => {
    const questions: Question[] = [
      makeQuestion({ id: "1", type: "mcq", prompt: "Q1?" }),
      makeQuestion({ id: "2", type: "fill_blank", prompt: "She ___" }),
    ];
    const quizSession: QuizSession = {
      questions,
      meta: { topic: "food", level: "A1", mode: "practice" },
    };
    const bundle: QuizPreviewSaveBundle = {
      title: "T",
      options: { topic: "food", level: "A1", mode: "practice", questionCount: 2 },
      quizSession,
    };
    expect(validateQuizPreviewBundle(bundle)).toBeNull();
  });

  it("rejects meta mismatch", () => {
    const questions: Question[] = [makeQuestion({ id: "1", type: "mcq" })];
    const bundle: QuizPreviewSaveBundle = {
      title: "T",
      options: { topic: "food", level: "A1", mode: "practice", questionCount: 1 },
      quizSession: {
        questions,
        meta: { topic: "school", level: "A1", mode: "practice" },
      },
    };
    expect(validateQuizPreviewBundle(bundle)).toMatch(/topic/);
  });
});
