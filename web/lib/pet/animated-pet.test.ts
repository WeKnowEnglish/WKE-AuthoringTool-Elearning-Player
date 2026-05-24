import { describe, expect, it } from "vitest";
import {
  resolvePetMoodDisplayScale,
  resolvePetSceneDisplayScale,
} from "@/lib/pet/animated-pet";

describe("resolvePetSceneDisplayScale", () => {
  it("boosts scene-downward", () => {
    expect(resolvePetSceneDisplayScale("scene-downward")).toBeGreaterThan(1);
  });

  it("shrinks scene-happy toward playful visual size", () => {
    expect(resolvePetSceneDisplayScale("scene-happy")).toBeLessThan(1);
  });

  it("leaves unlisted scenes at 1", () => {
    expect(resolvePetSceneDisplayScale("scene-standing")).toBe(1);
  });
});

describe("resolvePetMoodDisplayScale", () => {
  it("boosts playful mood", () => {
    expect(resolvePetMoodDisplayScale("playful")).toBe(
      resolvePetSceneDisplayScale("scene-downward"),
    );
  });

  it("applies scene-happy scale for normal and excited", () => {
    expect(resolvePetMoodDisplayScale("normal")).toBe(
      resolvePetSceneDisplayScale("scene-happy"),
    );
    expect(resolvePetMoodDisplayScale("excited")).toBe(
      resolvePetSceneDisplayScale("scene-happy"),
    );
  });

  it("maps sad mood to scene-sad", () => {
    expect(resolvePetMoodDisplayScale("sad")).toBe(
      resolvePetSceneDisplayScale("scene-sad"),
    );
  });
});
