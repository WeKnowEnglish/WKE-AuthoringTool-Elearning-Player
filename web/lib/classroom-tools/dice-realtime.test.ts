import { describe, expect, it } from "vitest";
import {
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
