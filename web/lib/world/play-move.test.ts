import { describe, expect, it } from "vitest";
import { aabbFromCenter, clampToAabb, moveWithWalls, nearPoint } from "./play-move";

describe("moveWithWalls", () => {
  const wall = aabbFromCenter(0, 2, 4, 1, 0);

  it("slides along a wall instead of walking through it", () => {
    const next = moveWithWalls(0, 0.4, 0, 1, 0.3, [wall]);
    expect(next.z).toBeLessThan(1.2);
    expect(next.x).toBe(0);
  });

  it("allows motion that stays clear of walls", () => {
    expect(moveWithWalls(0, 0, 1, 0, 0.3, [wall])).toEqual({ x: 1, z: 0 });
  });

  it("keeps the player inside a circular yard", () => {
    const next = moveWithWalls(8, 0, 4, 0, 0.3, [], 8);
    expect(Math.hypot(next.x, next.z)).toBeLessThanOrEqual(8.001);
  });
});

describe("nearPoint", () => {
  it("detects a door trigger", () => {
    expect(nearPoint(0, 3.2, 0, 3.5, 1.2)).toBe(true);
    expect(nearPoint(4, 0, 0, 3.5, 1.2)).toBe(false);
  });
});

describe("clampToAabb", () => {
  it("keeps the player inside the room", () => {
    const box = { minX: -5, maxX: 5, minZ: -5, maxZ: 5 };
    expect(clampToAabb(9, 0, box, 0.28)).toEqual({ x: 4.72, z: 0 });
    expect(clampToAabb(0, -9, box, 0.28)).toEqual({ x: 0, z: -4.72 });
  });
});
