import { describe, expect, it } from "vitest";
import { findNearestInteractable } from "@/lib/live-game/engine/interact";
import { ENGLISH_CRAFT_WOOD_TREES_V1 } from "@/lib/live-game/modes/english-craft/map-objects-v1";
import {
  isMcAnswerCorrect,
  pickMcQuestionForNode,
  toClientMcQuestion,
} from "@/lib/live-game/modes/english-craft/questions-v1";
import {
  clearLiveGameChallengesForTests,
  createLiveGameChallenge,
  getLiveGameChallenge,
} from "@/lib/live-game/server/challenge-store";
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

describe("live-game challenge store", () => {
  it("creates and retrieves challenge records", () => {
    clearLiveGameChallengesForTests();
    const record = createLiveGameChallenge({
      roomId: "wke-live-game-ABC234",
      playerId: "student-1",
      nodeId: "tree-01",
      questionId: "mc-hot-cold",
      correctAnswer: "cold",
    });
    expect(getLiveGameChallenge(record.challengeId)?.nodeId).toBe("tree-01");
  });
});

describe("live-game node availability", () => {
  it("blocks nodes during cooldown", () => {
    expect(
      isResourceNodeAvailable({
        available: true,
        cooldownEndsAt: Date.now() + 10_000,
      }),
    ).toBe(false);
    expect(
      isResourceNodeAvailable({
        available: false,
        cooldownEndsAt: null,
      }),
    ).toBe(false);
    expect(
      isResourceNodeAvailable({
        available: true,
        cooldownEndsAt: Date.now() - 1,
      }),
    ).toBe(true);
  });
});
