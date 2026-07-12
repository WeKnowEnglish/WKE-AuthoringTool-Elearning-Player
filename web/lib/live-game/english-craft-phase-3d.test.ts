import { beforeEach, describe, expect, it, vi } from "vitest";
import { GRADE56_ADJECTIVES_MC_V1 } from "@/lib/live-game/modes/english-craft/grade56-adjectives-v1";
import {
  isAdjectiveDepositSpellCorrect,
  normalizeDepositSpelling,
  toClientDepositSpell,
} from "@/lib/live-game/modes/english-craft/questions-v1";
import { buildSystemSnapshotFromSeeds } from "@/lib/live-game/question-banks/seed-data";
import {
  getQuestionById,
  isDepositSpellCorrect,
} from "@/lib/live-game/server/question-set-resolver";
import { getDepositPayload } from "@/lib/live-game/server/question-set-snapshot";
import * as repository from "@/lib/live-game/server/question-set-repository";

describe("english-craft phase 3d deposit spelling", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(repository, "fetchPublishedSetBySlug").mockResolvedValue(
      buildSystemSnapshotFromSeeds("grade56-adjectives"),
    );
  });

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

  it("resolves spell metadata from the deposit bank", async () => {
    const deposit = await getQuestionById("grade56-adjectives", "deposit", "deposit-adj-001", 1);
    expect(deposit).not.toBeNull();
    const payload = getDepositPayload(deposit!);
    expect(payload.targetWord).toBe("enormous");
    expect(payload.spellHint).toBe("very big");
  });

  it("checks deposit spelling through the resolver", async () => {
    await expect(isDepositSpellCorrect("grade56-adjectives", "deposit-adj-002", "tiny")).resolves.toBe(true);
    await expect(isDepositSpellCorrect("grade56-adjectives", "deposit-adj-002", "small")).resolves.toBe(false);
  });

  it("never exposes targetWord in client deposit payload", () => {
    const client = toClientDepositSpell({
      resourceType: "wood",
      spellHint: "very big",
      storageLabel: "Wood pile",
      targetWord: "enormous",
      shuffleSeed: "challenge-123",
    });
    expect(client.resourceType).toBe("wood");
    expect(client.spellHint).toBe("very big");
    expect(client.storageLabel).toBe("Wood pile");
    expect(client.slotCount).toBe(8);
    expect(client.answerLetters.join("")).toBe("enormous");
    expect(client.letterBank).toHaveLength(8);
    expect([...client.letterBank].sort().join("")).toBe(
      [...client.answerLetters].sort().join(""),
    );
    expect(client).not.toHaveProperty("targetWord");
  });

  it("stores spell metadata for every adjective bank item", () => {
    for (const question of GRADE56_ADJECTIVES_MC_V1) {
      expect(question.targetWord.trim().length).toBeGreaterThan(0);
      expect(question.spellHint.trim().length).toBeGreaterThan(0);
    }
  });
});
