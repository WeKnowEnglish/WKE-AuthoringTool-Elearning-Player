import { describe, expect, it } from "vitest";
import {
  growthStageForPreset,
  robotGrowthGroupId,
  robotGrowthStage,
} from "@/lib/avatar/growth";

describe("robotGrowthStage", () => {
  it("maps player level to stages 1-5", () => {
    expect(robotGrowthStage(1)).toBe(1);
    expect(robotGrowthStage(2)).toBe(1);
    expect(robotGrowthStage(3)).toBe(2);
    expect(robotGrowthStage(5)).toBe(2);
    expect(robotGrowthStage(6)).toBe(3);
    expect(robotGrowthStage(9)).toBe(3);
    expect(robotGrowthStage(10)).toBe(4);
    expect(robotGrowthStage(14)).toBe(4);
    expect(robotGrowthStage(15)).toBe(5);
    expect(robotGrowthStage(99)).toBe(5);
  });
});

describe("growthStageForPreset", () => {
  it("returns stage only for robot preset", () => {
    expect(growthStageForPreset("robot", 10)).toBe(4);
    expect(growthStageForPreset("fox", 20)).toBeNull();
    expect(growthStageForPreset(null, 20)).toBeNull();
  });
});

describe("robotGrowthGroupId", () => {
  it("matches svg group ids", () => {
    expect(robotGrowthGroupId(3)).toBe("item-robot-growth-3");
  });
});
