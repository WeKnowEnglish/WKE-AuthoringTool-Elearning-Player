import { describe, expect, it } from "vitest";
import { buildPrimaryProgressModel } from "./build-primary-progress-model";

describe("buildPrimaryProgressModel", () => {
  it("returns economy fields and empty mastery for empty rewards", () => {
    const model = buildPrimaryProgressModel({
      gold: 12,
      experience: 0,
      rewardedEventIds: [],
      ownedStickerIds: [],
    });
    expect(model.gold).toBe(12);
    expect(model.level).toBe(1);
    expect(model.mastery.total).toBe(0);
    expect(model.vocabSets.total).toBeGreaterThan(0);
    expect(model.vocabSets.completed).toBe(0);
    expect(model.badges.length).toBeGreaterThan(0);
  });
});
