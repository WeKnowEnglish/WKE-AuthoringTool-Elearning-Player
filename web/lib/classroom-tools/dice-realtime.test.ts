import { describe, expect, it } from "vitest";
import {
  createSeededDiceRandom,
  createEmptyRandomiser,
  normalizeRandomiserState,
  rollDice,
} from "@/lib/classroom-tools/dice";

describe("normalizeRandomiserState", () => {
  it("accepts serialized dice state including a roll", () => {
    const state = rollDice(createEmptyRandomiser(), { random: () => 0.5, nowMs: 10 });
    expect(normalizeRandomiserState(state)).toEqual(state);
  });

  it("rejects malformed realtime dice state", () => {
    expect(normalizeRandomiserState({ preset: "d6" })).toBeNull();
    expect(normalizeRandomiserState({ ...createEmptyRandomiser(), visibility: "everyone" })).toBeNull();
  });
});

describe("createSeededDiceRandom", () => {
  it("replays the same classroom roll for optimistic and server projections", () => {
    const first = rollDice(createEmptyRandomiser(), {
      random: createSeededDiceRandom(12345),
      nowMs: 10,
    });
    const second = rollDice(createEmptyRandomiser(), {
      random: createSeededDiceRandom(12345),
      nowMs: 20,
    });
    expect(second.lastRoll?.values).toEqual(first.lastRoll?.values);
    expect(second.lastRoll?.labels).toEqual(first.lastRoll?.labels);
  });
});
