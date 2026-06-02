import { describe, expect, it } from "vitest";
import { IMPLEMENTED_PLAY_MINIGAMES, pickPlayMiniGame } from "@/lib/pet/play-minigames";

describe("pickPlayMiniGame", () => {
  it("only picks implemented games", () => {
    for (let i = 0; i < 30; i++) {
      const id = pickPlayMiniGame(() => i / 30);
      expect(IMPLEMENTED_PLAY_MINIGAMES).toContain(id);
    }
  });

  it("includes climb, scrabble, and memory in the pool", () => {
    expect(IMPLEMENTED_PLAY_MINIGAMES).toEqual(["climb", "scrabble", "memory"]);
  });

  it("can pick climb", () => {
    expect(pickPlayMiniGame(() => 0)).toBe("climb");
  });

  it("can pick scrabble", () => {
    expect(pickPlayMiniGame(() => 0.4)).toBe("scrabble");
  });

  it("can pick memory", () => {
    expect(pickPlayMiniGame(() => 0.85)).toBe("memory");
  });
});
