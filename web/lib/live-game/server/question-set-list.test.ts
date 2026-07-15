import { beforeEach, describe, expect, it, vi } from "vitest";
import { LIVE_GAME_SYSTEM_SET_UUIDS } from "@/lib/live-game/question-banks/question-set-ids";
import { EXPECTED_SYSTEM_SEED_COUNTS } from "@/lib/live-game/question-banks/seed-data";
import { totalQuestionCount } from "@/lib/live-game/question-banks/question-set-card-utils";
import * as summaries from "@/lib/live-game/server/published-set-summaries";
import {
  listPublishedQuestionSetsForHost,
  listPublishedQuestionSetsForHostWithMeta,
} from "@/lib/live-game/server/question-set-list";

describe("live-game question set list", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("maps db summaries to carousel cards", async () => {
    vi.spyOn(summaries, "fetchPublishedSetSummariesWithMeta").mockResolvedValue({
      summaries: [
        {
          id: LIVE_GAME_SYSTEM_SET_UUIDS["daily-routines-a1"],
          slug: "daily-routines-a1",
          title: "Daily Routines",
          level: "A1",
          topic: "Routines",
          learningObjective: "Describe routines.",
          description: "Morning routines.",
          version: 1,
          visibility: "system",
          harvestCount: 6,
          depositCount: 6,
          craftCount: 1,
        },
      ],
      queryCount: 1,
      queryStrategy: "rpc_aggregate",
      resultCount: 1,
    });

    const cards = await listPublishedQuestionSetsForHost();
    expect(cards).toHaveLength(1);
    expect(cards[0]?.questionCount).toBe(13);
    expect(cards[0]?.id).toBe(LIVE_GAME_SYSTEM_SET_UUIDS["daily-routines-a1"]);
  });

  it("returns an empty list when db has no published sets", async () => {
    vi.spyOn(summaries, "fetchPublishedSetSummariesWithMeta").mockResolvedValue({
      summaries: [],
      queryCount: 1,
      queryStrategy: "empty_result",
      resultCount: 0,
    });

    const cards = await listPublishedQuestionSetsForHost();
    expect(cards).toHaveLength(0);
  });

  it("exposes query strategy metadata for diagnostics", async () => {
    vi.spyOn(summaries, "fetchPublishedSetSummariesWithMeta").mockResolvedValue({
      summaries: [
        {
          id: LIVE_GAME_SYSTEM_SET_UUIDS["daily-routines-a1"],
          slug: "daily-routines-a1",
          title: "Daily Routines",
          level: "A1",
          topic: "Routines",
          learningObjective: "Describe routines.",
          description: "Morning routines.",
          version: 1,
          visibility: "system",
          harvestCount: 0,
          depositCount: 0,
          craftCount: 0,
        },
      ],
      queryCount: 1,
      queryStrategy: "rpc_aggregate",
      resultCount: 1,
    });
    const listed = await listPublishedQuestionSetsForHostWithMeta();
    expect(listed.queryStrategy).toBe("rpc_aggregate");
    expect(listed.queryCount).toBe(1);
    expect(listed.sets[0]?.questionCount).toBe(0);
  });

  it("keeps expected system seed counts for parity checks", () => {
    const expected = EXPECTED_SYSTEM_SEED_COUNTS["grade56-adjectives"];
    expect(
      totalQuestionCount({
        harvestCount: expected.harvest,
        depositCount: expected.deposit,
        craftCount: expected.craft,
      }),
    ).toBe(121);
  });
});
