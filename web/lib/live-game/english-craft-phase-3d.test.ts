import { describe, expect, it } from "vitest";
import { GRADE56_ADJECTIVES_MC_V1 } from "@/lib/live-game/modes/english-craft/grade56-adjectives-v1";
import {
  isAdjectiveDepositSpellCorrect,
  normalizeDepositSpelling,
  toClientDepositSpell,
} from "@/lib/live-game/modes/english-craft/questions-v1";
import {
  getQuestionSetSpellMetadata,
  isQuestionSetDepositSpellCorrect,
} from "@/lib/live-game/modes/english-craft/question-sets";

describe("english-craft phase 3d deposit spelling", () => {
  it("normalizes spellings for comparison", () => {
    expect(normalizeDepositSpelling("  Enormous ")).toBe("enormous");
    expect(normalizeDepositSpelling("Very  Big")).toBe("very big");
  });

  it("validates adjective spellings case-insensitively", () => {
    const question = GRADE56_ADJECTIVES_MC_V1[0]!;
    expect(isAdjectiveDepositSpellCorrect(question, "enormous")).toBe(true);
    expect(isAdjectiveDepositSpellCorrect(question, "ENORMOUS")).toBe(true);
    expect(isAdjectiveDepositSpellCorrect(question, "tiny")).toBe(false);
  });

  it("resolves spell metadata from the question set", () => {
    const metadata = getQuestionSetSpellMetadata("grade56-adjectives", "adj-001");
    expect(metadata?.targetWord).toBe("enormous");
    expect(metadata?.spellHint).toBe("very big");
  });

  it("checks deposit spelling through the question set helper", () => {
    expect(isQuestionSetDepositSpellCorrect("grade56-adjectives", "adj-002", "tiny")).toBe(true);
    expect(isQuestionSetDepositSpellCorrect("grade56-adjectives", "adj-002", "small")).toBe(false);
  });

  it("never exposes targetWord in client deposit payload", () => {
    const client = toClientDepositSpell({
      resourceType: "wood",
      spellHint: "very big",
      storageLabel: "Wood pile",
    });
    expect(client).toEqual({
      resourceType: "wood",
      spellHint: "very big",
      storageLabel: "Wood pile",
    });
    expect(client).not.toHaveProperty("targetWord");
  });

  it("stores spell metadata for every adjective bank item", () => {
    for (const question of GRADE56_ADJECTIVES_MC_V1) {
      expect(question.targetWord.trim().length).toBeGreaterThan(0);
      expect(question.spellHint.trim().length).toBeGreaterThan(0);
    }
  });
});
