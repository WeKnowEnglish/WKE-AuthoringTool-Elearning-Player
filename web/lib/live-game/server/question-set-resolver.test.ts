import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashSeed } from "@/lib/live-game/question-banks/hash-seed";
import { buildSystemSnapshotFromSeeds } from "@/lib/live-game/question-banks/seed-data";
import { SYSTEM_QUESTION_SET_SUMMARIES } from "@/lib/live-game/question-banks/system-seed-source";
import {
  clearQuestionSetResolverCacheForTests,
  getQuestionSetSnapshot,
  isHarvestAnswerCorrect,
  pickDepositQuestion,
  pickHarvestQuestion,
  QuestionSetNotFoundError,
} from "@/lib/live-game/server/question-set-resolver";
import * as repository from "@/lib/live-game/server/question-set-repository";

describe("live-game system seed snapshots", () => {
  it("matches expected harvest counts for every curated set", () => {
    for (const summary of SYSTEM_QUESTION_SET_SUMMARIES) {
      const snapshot = buildSystemSnapshotFromSeeds(summary.id);
      expect(snapshot.harvest.length).toBeGreaterThanOrEqual(6);
      expect(snapshot.craft).toHaveLength(1);
      expect(snapshot.deposit.length).toBe(snapshot.harvest.length);
    }
  });
});

describe("live-game question set resolver", () => {
  beforeEach(() => {
    clearQuestionSetResolverCacheForTests();
    vi.restoreAllMocks();
  });

  it("picks deterministically from harvest bank", async () => {
    const snapshot = buildSystemSnapshotFromSeeds("daily-routines-a1");
    vi.spyOn(repository, "fetchPublishedSetBySlug").mockResolvedValue(snapshot);

    const first = await pickHarvestQuestion("daily-routines-a1", 1, "player:tree-01:0");
    const second = await pickHarvestQuestion("daily-routines-a1", 1, "player:tree-01:0");
    expect(second.id).toBe(first.id);
    expect(first.bank).toBe("harvest");
  });

  it("picks independently from deposit bank", async () => {
    const snapshot = buildSystemSnapshotFromSeeds("daily-routines-a1");
    vi.spyOn(repository, "fetchPublishedSetBySlug").mockResolvedValue(snapshot);

    const deposit = await pickDepositQuestion("daily-routines-a1", 1, "player:storage-01:0");
    expect(deposit.bank).toBe("deposit");
    expect(deposit.payload.type).toBe("deposit_spell");
  });

  it("validates multi-correct harvest answers via db snapshot", async () => {
    const snapshot = buildSystemSnapshotFromSeeds("daily-routines-a1");
    const question = snapshot.harvest[0]!;
    if (question.payload.type !== "multiple_choice") {
      throw new Error("expected multiple choice");
    }
    const payload = {
      ...question.payload,
      correctAnswers: [...question.payload.correctAnswers, question.payload.options[1]!],
    };
    const patched = {
      ...snapshot,
      harvest: [{ ...question, payload }],
    };
    vi.spyOn(repository, "fetchPublishedSetBySlug").mockResolvedValue(patched);

    const multiCorrectId = question.legacySourceId ?? question.id;
    await expect(
      isHarvestAnswerCorrect("daily-routines-a1", multiCorrectId, payload.correctAnswers[0]!),
    ).resolves.toBe(true);
    await expect(
      isHarvestAnswerCorrect("daily-routines-a1", multiCorrectId, payload.correctAnswers[1]!),
    ).resolves.toBe(true);
    await expect(
      isHarvestAnswerCorrect("daily-routines-a1", multiCorrectId, "definitely-wrong"),
    ).resolves.toBe(false);
  });

  it("throws when repository returns null", async () => {
    vi.spyOn(repository, "fetchPublishedSetBySlug").mockResolvedValue(null);
    vi.spyOn(repository, "fetchPublishedSetById").mockResolvedValue(null);

    await expect(getQuestionSetSnapshot("school-life-a1")).rejects.toBeInstanceOf(
      QuestionSetNotFoundError,
    );
  });

  it("uses the same hash helper as deterministic picks", () => {
    const snapshot = buildSystemSnapshotFromSeeds("describing-places-a1");
    const seed = "player:node:2";
    const index = hashSeed(seed) % snapshot.harvest.length;
    expect(snapshot.harvest[index]?.bank).toBe("harvest");
  });
});
