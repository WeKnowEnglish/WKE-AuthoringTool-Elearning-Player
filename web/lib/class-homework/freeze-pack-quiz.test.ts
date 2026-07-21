import { describe, expect, it } from "vitest";
import {
  freezePackQuizPayload,
  parseStoredPackQuizQuestions,
} from "@/lib/class-homework/freeze-pack-quiz";
import type { PackQuizCompiledQuestion } from "@/lib/vocabulary/pack-quiz";
import { mcQuizPayloadSchema } from "@/lib/lesson-schemas";

function q(id: string, label: string): PackQuizCompiledQuestion {
  return {
    id,
    wordId: id,
    mode: "find_lemma",
    payload: mcQuizPayloadSchema.parse({
      type: "interaction",
      subtype: "mc_quiz",
      question: `Find: ${label}`,
      options: [
        { id: "a", label },
        { id: "b", label: "x" },
        { id: "c", label: "y" },
        { id: "d", label: "z" },
      ],
      correct_option_id: "a",
      shuffle_options: false,
    }),
  };
}

describe("freezePackQuizPayload", () => {
  it("freezes questions and sets questionCount", () => {
    const questions = [q("a", "cat"), q("b", "dog")];
    const payload = freezePackQuizPayload({
      quizId: "quiz-1",
      quizTitle: "Pets",
      questions,
      frozenAt: "2026-01-01T00:00:00.000Z",
    });
    expect(payload.quizId).toBe("quiz-1");
    expect(payload.questionCount).toBe(2);
    expect(payload.questions).toHaveLength(2);
    expect(payload.frozenAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("always takes the latest questions when quizId is unchanged", () => {
    const oldQs = [q("old", "cat")];
    const previous = freezePackQuizPayload({
      quizId: "quiz-1",
      quizTitle: "Old title",
      questions: oldQs,
      frozenAt: "2026-01-01T00:00:00.000Z",
    });
    const next = freezePackQuizPayload({
      quizId: "quiz-1",
      quizTitle: "New title",
      questions: [q("new", "dog"), q("new2", "bird")],
      previous,
      frozenAt: "2026-02-01T00:00:00.000Z",
    });
    expect(next.questions).toHaveLength(2);
    expect(next.questions?.[0]?.id).toBe("new");
    expect(next.frozenAt).toBe("2026-02-01T00:00:00.000Z");
    expect(next.quizTitle).toBe("New title");
  });

  it("replaces snapshot when quizId changes", () => {
    const previous = freezePackQuizPayload({
      quizId: "quiz-1",
      quizTitle: "A",
      questions: [q("old", "cat")],
    });
    const next = freezePackQuizPayload({
      quizId: "quiz-2",
      quizTitle: "B",
      questions: [q("n1", "dog"), q("n2", "bird")],
      previous,
    });
    expect(next.quizId).toBe("quiz-2");
    expect(next.questions).toHaveLength(2);
    expect(next.questions?.[0]?.id).toBe("n1");
  });
});

describe("parseStoredPackQuizQuestions", () => {
  it("drops malformed entries", () => {
    const good = q("a", "cat");
    const parsed = parseStoredPackQuizQuestions([
      good,
      { id: "bad" },
      null,
      { id: "x", wordId: "x", mode: "find_lemma", payload: { type: "story" } },
    ]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.id).toBe("a");
  });
});
