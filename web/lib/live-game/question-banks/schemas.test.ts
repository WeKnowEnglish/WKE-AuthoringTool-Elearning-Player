import { describe, expect, it } from "vitest";
import {
  craftSentencePayloadSchema,
  depositSpellPayloadSchema,
  harvestMcPayloadSchema,
  isHarvestAnswerCorrect,
  parseCraftPayload,
  parseDepositPayload,
  parseHarvestPayload,
} from "@/lib/live-game/question-banks/schemas";

describe("live-game question payload schemas", () => {
  it("accepts valid harvest payloads with multiple correct answers", () => {
    const payload = parseHarvestPayload({
      type: "multiple_choice",
      options: ["a", "b", "c", "d"],
      correctAnswers: ["a", "c"],
    });
    expect(isHarvestAnswerCorrect(payload, "a")).toBe(true);
    expect(isHarvestAnswerCorrect(payload, "c")).toBe(true);
    expect(isHarvestAnswerCorrect(payload, "b")).toBe(false);
  });

  it("rejects harvest payloads with no correct answers", () => {
    expect(() =>
      harvestMcPayloadSchema.parse({
        type: "multiple_choice",
        options: ["a", "b"],
        correctAnswers: [],
      }),
    ).toThrow();
  });

  it("rejects harvest payloads with correct answers outside options", () => {
    expect(() =>
      harvestMcPayloadSchema.parse({
        type: "multiple_choice",
        options: ["a", "b"],
        correctAnswers: ["c"],
      }),
    ).toThrow();
  });

  it("accepts valid deposit payloads", () => {
    const payload = parseDepositPayload({
      type: "deposit_spell",
      targetWord: "tiny",
      spellHint: "very small",
    });
    expect(payload.targetWord).toBe("tiny");
  });

  it("rejects invalid deposit target words", () => {
    expect(() =>
      depositSpellPayloadSchema.parse({
        type: "deposit_spell",
        targetWord: "Not Valid",
        spellHint: "hint",
      }),
    ).toThrow();
  });

  it("accepts valid craft payloads", () => {
    const payload = parseCraftPayload({
      type: "drag_sentence",
      wordBank: ["I", "usually", "play"],
      correctOrder: ["I", "usually", "play"],
      slotCount: 3,
    });
    expect(payload.slotCount).toBe(3);
  });

  it("rejects craft payloads when word bank multiset mismatches", () => {
    expect(() =>
      craftSentencePayloadSchema.parse({
        type: "drag_sentence",
        wordBank: ["I", "usually", "play"],
        correctOrder: ["I", "play", "usually"],
        slotCount: 3,
      }),
    ).not.toThrow();

    expect(() =>
      craftSentencePayloadSchema.parse({
        type: "drag_sentence",
        wordBank: ["I", "usually"],
        correctOrder: ["I", "play", "usually"],
        slotCount: 3,
      }),
    ).toThrow();
  });
});
