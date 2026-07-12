import { describe, expect, it } from "vitest";
import { GRADE56_ADJECTIVES_CRAFT_V1, GRADE56_ADJECTIVES_MC_V1 } from "@/lib/live-game/modes/english-craft/grade56-adjectives-v1";
import { toClientMcQuestion } from "@/lib/live-game/modes/english-craft/questions-v1";

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

  it("includes a craft sentence with valid order", () => {
    expect(GRADE56_ADJECTIVES_MC_V1).toHaveLength(60);
    const craft = GRADE56_ADJECTIVES_CRAFT_V1;
    expect(craft.correctOrder).toHaveLength(craft.slotCount);
    expect(craft.wordBank).toHaveLength(craft.correctOrder.length);
  });

  it("keeps spell hints for every target word", () => {
    for (const question of GRADE56_ADJECTIVES_MC_V1) {
      expect(question.spellHint.trim().length).toBeGreaterThan(0);
      expect(question.targetWord.trim().length).toBeGreaterThan(0);
    }
  });
});
