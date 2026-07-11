import { describe, expect, it } from "vitest";
import { toLiveGameCharacterId } from "@/lib/live-game/characters/live-game-characters";

describe("toLiveGameCharacterId", () => {
  it("returns valid character ids unchanged", () => {
    expect(toLiveGameCharacterId("girl-3")).toBe("girl-3");
    expect(toLiveGameCharacterId("boy-5")).toBe("boy-5");
  });

  it("maps legacy ids to defaults", () => {
    expect(toLiveGameCharacterId("boy")).toBe("boy-1");
    expect(toLiveGameCharacterId("student")).toBe("boy-1");
  });

  it("falls back to boy-1 for unknown ids", () => {
    expect(toLiveGameCharacterId("not-a-character")).toBe("boy-1");
  });
});
