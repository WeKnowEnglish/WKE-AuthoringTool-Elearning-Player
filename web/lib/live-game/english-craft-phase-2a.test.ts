import { describe, expect, it } from "vitest";
import { findNearestInteractable } from "@/lib/live-game/engine/interact";
import { ENGLISH_CRAFT_WOOD_TREES_V1 } from "@/lib/live-game/modes/english-craft/map-objects-v1";
import {
  isMcAnswerCorrect,
  pickMcQuestionForNode,
  toClientMcQuestion,
} from "@/lib/live-game/modes/english-craft/questions-v1";
import {
  isEnglishCraftResourceNodeInteractable,
} from "@/lib/live-game/modes/english-craft/gameplay-v1";
import {
  canReclaimLiveGameAward,
  isLiveGameChallengeExpired,
  LIVE_GAME_AWARD_CLAIM_LEASE_MS,
} from "@/lib/live-game/server/challenge-lifecycle";
import { isResourceNodeAvailable } from "@/lib/live-game/server/read-storage";

describe("english-craft questions", () => {
  it("picks stable questions per node id", () => {
    const first = pickMcQuestionForNode("tree-01");
    const second = pickMcQuestionForNode("tree-01");
    expect(first.id).toBe(second.id);
  });

  it("never exposes correct answers in client payload", () => {
    const question = pickMcQuestionForNode("tree-02");
    const client = toClientMcQuestion(question);
    expect(client).not.toHaveProperty("correctAnswer");
    expect(isMcAnswerCorrect(question.id, question.correctAnswer)).toBe(true);
    expect(isMcAnswerCorrect(question.id, "wrong")).toBe(false);
  });
});

describe("live-game interact", () => {
  it("finds the nearest tree within radius", () => {
    const tree = ENGLISH_CRAFT_WOOD_TREES_V1[0]!;
    const playerX = tree.x - 16;
    const playerY = tree.y - 32;
    const target = findNearestInteractable(playerX, playerY, ENGLISH_CRAFT_WOOD_TREES_V1);
    expect(target?.id).toBe(tree.id);
  });

  it("returns null when no tree is in range", () => {
    const target = findNearestInteractable(0, 0, ENGLISH_CRAFT_WOOD_TREES_V1);
    expect(target).toBeNull();
  });
});

describe("live-game challenge lifecycle", () => {
  it("treats the exact expiry boundary as expired", () => {
    expect(isLiveGameChallengeExpired(10_000, 9_999)).toBe(false);
    expect(isLiveGameChallengeExpired(10_000, 10_000)).toBe(true);
  });

  it("only reclaims an abandoned award after the processing lease", () => {
    const claimedAt = 10_000;
    expect(canReclaimLiveGameAward(null, claimedAt + LIVE_GAME_AWARD_CLAIM_LEASE_MS)).toBe(false);
    expect(
      canReclaimLiveGameAward(claimedAt, claimedAt + LIVE_GAME_AWARD_CLAIM_LEASE_MS - 1),
    ).toBe(false);
    expect(
      canReclaimLiveGameAward(claimedAt, claimedAt + LIVE_GAME_AWARD_CLAIM_LEASE_MS),
    ).toBe(true);
  });
});

describe("live-game node availability", () => {
  const now = 1_000_000;

  it("blocks nodes only while cooldown is active", () => {
    expect(
      isEnglishCraftResourceNodeInteractable({
        available: true,
        cooldownEndsAt: now + 10_000,
      }, now),
    ).toBe(false);
    expect(
      isEnglishCraftResourceNodeInteractable({
        available: false,
        cooldownEndsAt: now + 10_000,
      }, now),
    ).toBe(false);
    expect(
      isEnglishCraftResourceNodeInteractable({
        available: true,
        cooldownEndsAt: now - 1,
      }, now),
    ).toBe(true);
  });

  it("treats elapsed cooldown as interactable even when available is stale", () => {
    expect(
      isResourceNodeAvailable({
        available: false,
        cooldownEndsAt: now - 1,
      }, now),
    ).toBe(true);
    expect(
      isResourceNodeAvailable({
        available: false,
        cooldownEndsAt: null,
      }, now),
    ).toBe(true);
  });
});
