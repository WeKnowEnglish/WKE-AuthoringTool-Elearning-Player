import { describe, expect, it } from "vitest";
import { findNearestInteractable } from "@/lib/live-game/engine/interact";
import { ENGLISH_CRAFT_CRAFT_BENCH_V1 } from "@/lib/live-game/modes/english-craft/map-objects-v1";
import {
  ENGLISH_CRAFT_CRAFT_BRIDGE_V1,
  isCraftAnswerCorrect,
  toClientCraftQuestion,
} from "@/lib/live-game/modes/english-craft/questions-v1";
import {
  canStartCraftChallenge,
} from "@/lib/live-game/server/read-storage";

describe("english-craft craft sentence", () => {
  it("never exposes correct order in client payload", () => {
    const client = toClientCraftQuestion(ENGLISH_CRAFT_CRAFT_BRIDGE_V1);
    expect(client).not.toHaveProperty("correctOrder");
    expect(client.slotCount).toBe(4);
    expect(client.wordBank).toHaveLength(4);
  });

  it("shuffles craft word bank deterministically per challenge id", () => {
    const first = toClientCraftQuestion(ENGLISH_CRAFT_CRAFT_BRIDGE_V1, "challenge-a");
    const second = toClientCraftQuestion(ENGLISH_CRAFT_CRAFT_BRIDGE_V1, "challenge-a");
    const third = toClientCraftQuestion(ENGLISH_CRAFT_CRAFT_BRIDGE_V1, "challenge-b");

    expect(second.wordBank).toEqual(first.wordBank);
    expect(third.wordBank).not.toEqual(first.wordBank);
    expect([...first.wordBank].sort()).toEqual([...ENGLISH_CRAFT_CRAFT_BRIDGE_V1.wordBank].sort());
  });

  it("accepts the pilot correct order", () => {
    expect(
      isCraftAnswerCorrect(ENGLISH_CRAFT_CRAFT_BRIDGE_V1.id, [
        "I",
        "usually",
        "play football",
        "after school",
      ]),
    ).toBe(true);
  });

  it("rejects wrong order and wrong length", () => {
    expect(
      isCraftAnswerCorrect(ENGLISH_CRAFT_CRAFT_BRIDGE_V1.id, [
        "usually",
        "I",
        "play football",
        "after school",
      ]),
    ).toBe(false);
    expect(isCraftAnswerCorrect(ENGLISH_CRAFT_CRAFT_BRIDGE_V1.id, ["I", "usually"])).toBe(false);
  });
});

describe("english-craft craft bench interact", () => {
  it("finds the bench within radius", () => {
    const bench = ENGLISH_CRAFT_CRAFT_BENCH_V1;
    const playerX = bench.x - 16;
    const playerY = bench.y - 32;
    const target = findNearestInteractable(playerX, playerY, [bench]);
    expect(target?.id).toBe(bench.id);
  });
});

describe("english-craft craft gates", () => {
  const playingSession = {
    session: { phase: "playing" as const },
    resourcePool: { wood: 10, stone: 5, wheat: 0, cotton: 0 },
    craftedItems: { benchBuilt: false, hammers: 0, boat: false },
  };

  it("allows build_bench when wood and stone goals are met", () => {
    expect(canStartCraftChallenge(playingSession)).toBe(true);
  });

  it("blocks build_bench below wood goal", () => {
    expect(
      canStartCraftChallenge({
        ...playingSession,
        resourcePool: { wood: 9, stone: 5, wheat: 0, cotton: 0 },
      }),
    ).toBe(false);
  });

  it("blocks build_bench when stone is short", () => {
    expect(
      canStartCraftChallenge({
        ...playingSession,
        resourcePool: { wood: 10, stone: 4, wheat: 0, cotton: 0 },
      }),
    ).toBe(false);
  });

  it("blocks build_bench after workbench is built", () => {
    expect(
      canStartCraftChallenge({
        ...playingSession,
        craftedItems: { benchBuilt: true, hammers: 0, boat: false },
      }),
    ).toBe(false);
  });
});
