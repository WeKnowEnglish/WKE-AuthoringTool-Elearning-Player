import { describe, expect, it } from "vitest";
import { GRADE56_ADJECTIVES_MC_V1 } from "@/lib/live-game/modes/english-craft/grade56-adjectives-v1";
import { toClientMcQuestion } from "@/lib/live-game/modes/english-craft/questions-v1";
import {
  getCraftQuestionFromSet,
  getLiveGameQuestionSet,
  isQuestionSetAnswerCorrect,
  isQuestionSetCraftAnswerCorrect,
} from "@/lib/live-game/modes/english-craft/question-sets";

const ANSWER_KEY =
  "cababbabaabaacaaababaaaabcababaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa".split("");

describe("grade56-adjectives-v1", () => {
  it("has 60 MC items with unique ids and target words", () => {
    expect(GRADE56_ADJECTIVES_MC_V1).toHaveLength(60);
    const ids = GRADE56_ADJECTIVES_MC_V1.map((q) => q.id);
    const targets = GRADE56_ADJECTIVES_MC_V1.map((q) => q.targetWord);
    expect(new Set(ids).size).toBe(60);
    expect(new Set(targets).size).toBe(60);
  });

  it("matches the docx answer key for every item", () => {
    for (let index = 0; index < GRADE56_ADJECTIVES_MC_V1.length; index += 1) {
      const question = GRADE56_ADJECTIVES_MC_V1[index]!;
      const letter = ANSWER_KEY[index]!;
      const letterIndex = { a: 0, b: 1, c: 2, d: 3 }[letter]!;
      expect(question.correctAnswer).toBe(question.options[letterIndex]);
      expect(isQuestionSetAnswerCorrect("grade56-adjectives", question.id, question.correctAnswer)).toBe(
        true,
      );
    }
  });

  it("never exposes server-only fields in client MC payload", () => {
    for (const question of GRADE56_ADJECTIVES_MC_V1) {
      const client = toClientMcQuestion(question);
      expect(client).not.toHaveProperty("correctAnswer");
      expect(client).not.toHaveProperty("targetWord");
      expect(client).not.toHaveProperty("spellHint");
      expect(client.options).toHaveLength(4);
    }
  });

  it("registers a playable set with craft sentence", () => {
    const set = getLiveGameQuestionSet("grade56-adjectives");
    expect(set.questions).toHaveLength(60);
    const craft = getCraftQuestionFromSet("grade56-adjectives");
    expect(isQuestionSetCraftAnswerCorrect("grade56-adjectives", craft.id, craft.correctOrder)).toBe(
      true,
    );
  });

  it("keeps spell hints for every target word", () => {
    for (const question of GRADE56_ADJECTIVES_MC_V1) {
      expect(question.spellHint.trim().length).toBeGreaterThan(0);
      expect(question.targetWord.trim().length).toBeGreaterThan(0);
    }
  });
});
