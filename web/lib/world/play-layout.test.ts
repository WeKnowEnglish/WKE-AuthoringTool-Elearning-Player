import { describe, expect, it } from "vitest";
import { circleHitsAabb, clampToAabb, moveWithWalls, nearPoint } from "./play-move";
import {
  PLAYER_RADIUS,
  YARD_RADIUS,
  houseInsideBounds,
  houseInsideDoor,
  houseInsideSpawn,
  leftInterior,
  schoolInsideBounds,
  schoolInsideDoor,
  schoolInsideSpawn,
  schoolInsideWalls,
  yardDoor,
  yardReturnSpawn,
  yardSpawn,
  yardWalls,
} from "./play-layout";

function walkTowardDoor(spot: "cottage" | "school") {
  const walls = yardWalls(spot);
  const door = yardDoor(spot);
  let { x, z } = yardSpawn(spot);
  for (let step = 0; step < 50; step += 1) {
    const next = moveWithWalls(x, z, 0, -0.35, PLAYER_RADIUS, walls, YARD_RADIUS);
    x = next.x;
    z = next.z;
  }
  return { x, z, door, walls };
}

describe("yard walls", () => {
  it("lets a student walk from the house path to the door", () => {
    const { x, z, door } = walkTowardDoor("cottage");
    expect(nearPoint(x, z, door.x, door.z, 1.4)).toBe(true);
  });

  it("lets a student walk through the school gate to the door", () => {
    const { x, z, door } = walkTowardDoor("school");
    expect(nearPoint(x, z, door.x, door.z, 1.4)).toBe(true);
  });

  it("keeps the school door outside the building collision", () => {
    const door = yardDoor("school");
    const building = yardWalls("school")[0]!;
    expect(circleHitsAabb(door.x, door.z, PLAYER_RADIUS, building)).toBe(false);
  });

  it("blocks walking through the house", () => {
    const walls = yardWalls("cottage");
    const next = moveWithWalls(0, 2.4, 0, -2, PLAYER_RADIUS, walls, YARD_RADIUS);
    expect(next.z).toBeGreaterThan(1.6);
  });
});

describe("interior rooms", () => {
  it("starts the student inside the house, not in the doorway void", () => {
    const spawn = houseInsideSpawn();
    expect(leftInterior("cottage", spawn.x, spawn.z)).toBe(false);
    expect(nearPoint(spawn.x, spawn.z, houseInsideDoor().x, houseInsideDoor().z, 1.35)).toBe(false);
  });

  it("starts the student inside the classroom", () => {
    const spawn = schoolInsideSpawn();
    expect(leftInterior("school", spawn.x, spawn.z)).toBe(false);
  });

  it("treats walking out the house door as leaving the room", () => {
    expect(leftInterior("cottage", 0, 5.1)).toBe(true);
    expect(leftInterior("cottage", 0, 2.4)).toBe(false);
    expect(leftInterior("cottage", 3, 5.1)).toBe(false);
  });

  it("treats walking out the school door as leaving the room", () => {
    expect(leftInterior("school", 0, 6.1)).toBe(true);
    expect(leftInterior("school", 0, 3.2)).toBe(false);
  });

  it("puts the student back in the garden, not in the doorway void", () => {
    const spawn = yardReturnSpawn("school");
    const door = yardDoor("school");
    expect(spawn).toEqual(yardSpawn("school"));
    expect(spawn.z).toBeGreaterThan(door.z);
  });

  it("clamps a wander past the house wall back into the room", () => {
    const boxed = clampToAabb(0, 12, houseInsideBounds(), PLAYER_RADIUS);
    expect(boxed.z).toBeLessThan(5.2);
    expect(leftInterior("cottage", boxed.x, boxed.z)).toBe(true);
  });

  it("lets the student walk from the classroom spawn to the door", () => {
    const walls = schoolInsideWalls();
    const door = schoolInsideDoor();
    let { x, z } = schoolInsideSpawn();
    for (let step = 0; step < 40; step += 1) {
      const next = moveWithWalls(x, z, 0, 0.25, PLAYER_RADIUS, walls);
      const boxed = clampToAabb(next.x, next.z, schoolInsideBounds(), PLAYER_RADIUS);
      x = boxed.x;
      z = boxed.z;
    }
    expect(nearPoint(x, z, door.x, door.z, 1.4) || leftInterior("school", x, z)).toBe(true);
  });
});
