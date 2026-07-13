import { describe, expect, it } from "vitest";
import { buildSystemSnapshotFromSeeds } from "@/lib/live-game/question-banks/seed-data";
import {
  clientQuestionId,
  toClientCraftQuestionFromRow,
  toClientDepositSpellFromRow,
  toClientMcQuestionFromRow,
} from "@/lib/live-game/question-banks/client-payloads";

describe("live-game question client payloads", () => {
  const snapshot = buildSystemSnapshotFromSeeds("daily-routines-a1");
  const harvestRow = snapshot.harvest[0]!;
  const depositRow = snapshot.deposit[0]!;
  const craftRow = snapshot.craft[0]!;

  it("prefers legacy source id for client-facing question ids", () => {
    expect(clientQuestionId(harvestRow)).toBe(harvestRow.legacySourceId);
    expect(clientQuestionId(harvestRow)).not.toBe(harvestRow.id);
  });

  it("shuffles harvest options deterministically", () => {
    const first = toClientMcQuestionFromRow(harvestRow, "seed-a");
    const second = toClientMcQuestionFromRow(harvestRow, "seed-a");
    const other = toClientMcQuestionFromRow(harvestRow, "seed-b");
    expect(second).toEqual(first);
    expect(other.options).not.toEqual(first.options);
    expect(first).not.toHaveProperty("correctAnswer");
    expect(first).not.toHaveProperty("correctAnswers");
  });

  it("shuffles craft word banks deterministically", () => {
    const question = toClientCraftQuestionFromRow(craftRow, "craft-seed");
    expect(question.type).toBe("drag_sentence");
    expect(question.wordBank).toHaveLength(craftRow.payload.type === "drag_sentence" ? craftRow.payload.wordBank.length : 0);
    expect(question).not.toHaveProperty("correctOrder");
  });

  it("never exposes deposit targetWord in client payload", () => {
    const spell = toClientDepositSpellFromRow(depositRow, {
      resourceType: "wood",
      storageLabel: "Wood pile",
      shuffleSeed: "deposit-seed",
    });
    expect(spell.spellHint.length).toBeGreaterThan(0);
    expect(spell).not.toHaveProperty("targetWord");
    expect(spell.slotCount).toBeGreaterThan(0);
  });
});
