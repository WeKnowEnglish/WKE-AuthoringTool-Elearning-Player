import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildSystemSnapshotFromSeeds } from "@/lib/live-game/question-banks/seed-data";
import {
  clearQuestionSetResolverCacheForTests,
  getQuestionSetSnapshot,
  QuestionSetNotFoundError,
  QuestionSetVersionMismatchError,
} from "@/lib/live-game/server/question-set-resolver";
import * as repository from "@/lib/live-game/server/question-set-repository";

describe("live-game question set resolver db-only", () => {
  beforeEach(() => {
    clearQuestionSetResolverCacheForTests();
    vi.restoreAllMocks();
  });

  it("throws QuestionSetNotFoundError when db has no published set", async () => {
    vi.spyOn(repository, "fetchPublishedSetBySlug").mockResolvedValue(null);
    vi.spyOn(repository, "fetchPublishedSetById").mockResolvedValue(null);

    await expect(getQuestionSetSnapshot("unknown-set")).rejects.toBeInstanceOf(
      QuestionSetNotFoundError,
    );
  });

  it("throws QuestionSetVersionMismatchError when pinned version differs", async () => {
    const snapshot = buildSystemSnapshotFromSeeds("daily-routines-a1");
    vi.spyOn(repository, "fetchPublishedSetBySlug").mockResolvedValue({
      ...snapshot,
      version: 2,
    });

    await expect(getQuestionSetSnapshot("daily-routines-a1", 1)).rejects.toBeInstanceOf(
      QuestionSetVersionMismatchError,
    );
  });

  it("returns snapshot when version matches", async () => {
    const snapshot = buildSystemSnapshotFromSeeds("school-life-a1");
    vi.spyOn(repository, "fetchPublishedSetBySlug").mockResolvedValue(snapshot);

    const loaded = await getQuestionSetSnapshot("school-life-a1", 1);
    expect(loaded.slug).toBe("school-life-a1");
    expect(loaded.version).toBe(1);
  });
});
