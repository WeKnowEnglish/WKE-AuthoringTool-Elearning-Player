import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashSeed } from "@/lib/live-game/question-banks/hash-seed";
import { buildSystemSnapshotFromSeeds } from "@/lib/live-game/question-banks/seed-data";
import { SYSTEM_QUESTION_SET_SUMMARIES } from "@/lib/live-game/question-banks/system-seed-source";
import { clientQuestionId } from "@/lib/live-game/question-banks/client-payloads";
import {
  pickCraftQuestion,
  pickDepositQuestion,
  pickHarvestQuestion,
} from "@/lib/live-game/server/question-set-resolver";
import * as repository from "@/lib/live-game/server/question-set-repository";

describe("live-game question set route parity", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  for (const summary of SYSTEM_QUESTION_SET_SUMMARIES) {
    const slug = summary.id;

    it(`matches seed harvest pick for ${slug}`, async () => {
      const snapshot = buildSystemSnapshotFromSeeds(slug);
      vi.spyOn(repository, "fetchPublishedSetBySlug").mockResolvedValue(snapshot);

      const seed = "player:tree-01:2";
      const index = hashSeed(seed) % snapshot.harvest.length;
      const expected = snapshot.harvest[index]!;
      const resolved = await pickHarvestQuestion(slug, summary.version, seed);
      expect(clientQuestionId(resolved)).toBe(expected.legacySourceId);
      expect(resolved.prompt).toBe(expected.prompt);
    });

    it(`returns deposit spell rows for ${slug}`, async () => {
      const snapshot = buildSystemSnapshotFromSeeds(slug);
      vi.spyOn(repository, "fetchPublishedSetBySlug").mockResolvedValue(snapshot);

      const deposit = await pickDepositQuestion(slug, summary.version, "player:storage:0");
      expect(deposit.bank).toBe("deposit");
      expect(deposit.payload.type).toBe("deposit_spell");
    });

    it(`matches seed craft id for ${slug}`, async () => {
      const snapshot = buildSystemSnapshotFromSeeds(slug);
      vi.spyOn(repository, "fetchPublishedSetBySlug").mockResolvedValue(snapshot);

      const expected = snapshot.craft[0]!;
      const resolved = await pickCraftQuestion(slug, summary.version, "player:boat:0");
      expect(clientQuestionId(resolved)).toBe(expected.legacySourceId);
      expect(resolved.payload.type).toBe("drag_sentence");
    });
  }
});
