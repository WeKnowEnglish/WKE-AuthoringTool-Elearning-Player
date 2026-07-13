import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildSystemSnapshotFromSeeds } from "@/lib/live-game/question-banks/seed-data";
import {
  clearQuestionSetResolverCacheForTests,
  getQuestionSetSnapshot,
  invalidateQuestionSetCache,
  QuestionSetNotFoundError,
} from "@/lib/live-game/server/question-set-resolver";
import * as repository from "@/lib/live-game/server/question-set-repository";

describe("invalidateQuestionSetCache", () => {
  beforeEach(() => {
    clearQuestionSetResolverCacheForTests();
    vi.restoreAllMocks();
  });

  it("drops cached snapshots by slug and id after invalidation", async () => {
    const snapshot = buildSystemSnapshotFromSeeds("daily-routines-a1");
    const fetchBySlug = vi
      .spyOn(repository, "fetchPublishedSetBySlug")
      .mockResolvedValue(snapshot);

    await getQuestionSetSnapshot("daily-routines-a1");
    fetchBySlug.mockResolvedValue(null);
    vi.spyOn(repository, "fetchPublishedSetById").mockResolvedValue(null);

    invalidateQuestionSetCache("daily-routines-a1");
    await expect(getQuestionSetSnapshot("daily-routines-a1")).rejects.toBeInstanceOf(
      QuestionSetNotFoundError,
    );
    expect(fetchBySlug).toHaveBeenCalledTimes(2);
  });
});
