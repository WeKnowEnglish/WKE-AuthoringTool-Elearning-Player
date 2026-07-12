import { describe, expect, it } from "vitest";
import { ENGLISH_CRAFT_CRAFT_BENCH_ID } from "@/lib/live-game/modes/english-craft/gameplay-v1";
import {
  ENGLISH_CRAFT_RESOURCE_NODES_V1,
  ENGLISH_CRAFT_STORAGE_BY_TYPE,
} from "@/lib/live-game/modes/english-craft/map-objects-v1";
import { LIVE_GAME_SYSTEM_SET_UUIDS } from "@/lib/live-game/question-banks/question-set-ids";
import type { LiveGameSessionState } from "@/lib/live-game/liveblocks/config";
import type { LiveGameChallengeRecord } from "@/lib/live-game/server/challenge-store";
import {
  inferQuestionBankFromNodeId,
  readChallengeQuestionSetContext,
} from "@/lib/live-game/server/question-set-challenge-context";

function baseSession(): LiveGameSessionState {
  return {
    modeId: "english_craft",
    phase: "playing",
    joinCode: "ABCD12",
    hostUserId: "host-1",
    durationMinutes: 20,
    endsAt: null,
    mapId: "english-craft-v1",
    createdAt: Date.now(),
    objectiveCompleted: false,
    victoryAt: null,
    completedByPlayerId: null,
    endedAt: null,
    endReason: null,
    lobbyNotice: null,
    questionSetId: LIVE_GAME_SYSTEM_SET_UUIDS["grade56-adjectives"],
    questionSetVersion: 1,
  };
}

function baseChallenge(overrides: Partial<LiveGameChallengeRecord> = {}): LiveGameChallengeRecord {
  return {
    challengeId: "ch_0123456789abcdef01234567",
    roomId: "wke-live-game-ABCD12",
    playerId: "player-1",
    nodeId: ENGLISH_CRAFT_RESOURCE_NODES_V1[0]!.id,
    questionId: "question-uuid",
    questionSetId: null,
    questionSetVersion: null,
    questionBank: null,
    expiresAt: Date.now() + 60_000,
    status: "active",
    ...overrides,
  };
}

describe("live-game challenge question set context", () => {
  it("infers harvest, deposit, and craft banks from node ids", () => {
    expect(inferQuestionBankFromNodeId(ENGLISH_CRAFT_RESOURCE_NODES_V1[0]!.id)).toBe("harvest");
    expect(inferQuestionBankFromNodeId(ENGLISH_CRAFT_STORAGE_BY_TYPE.wood.id)).toBe("deposit");
    expect(inferQuestionBankFromNodeId(ENGLISH_CRAFT_CRAFT_BENCH_ID)).toBe("craft");
    expect(inferQuestionBankFromNodeId("unknown-node")).toBeNull();
  });

  it("uses session version when challenge snapshot is missing", () => {
    const ctx = readChallengeQuestionSetContext(baseSession(), baseChallenge());
    expect(ctx.version).toBe(1);
    expect(ctx.bank).toBe("harvest");
    expect(ctx.setId).toBe(LIVE_GAME_SYSTEM_SET_UUIDS["grade56-adjectives"]);
  });

  it("prefers challenge snapshot metadata when present", () => {
    const frozenVersion = 3;
    const frozenSetId = LIVE_GAME_SYSTEM_SET_UUIDS["daily-routines-a1"];
    const ctx = readChallengeQuestionSetContext(
      baseSession(),
      baseChallenge({
        questionSetId: frozenSetId,
        questionSetVersion: frozenVersion,
        questionBank: "deposit",
        nodeId: ENGLISH_CRAFT_STORAGE_BY_TYPE.stone.id,
      }),
    );
    expect(ctx.version).toBe(frozenVersion);
    expect(ctx.bank).toBe("deposit");
    expect(ctx.setId).toBe(frozenSetId);
  });
});
