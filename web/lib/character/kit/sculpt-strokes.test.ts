import { describe, expect, it } from "vitest";
import { buildHeadGeometryFromProfile } from "./build-head-geometry";
import { DEFAULT_HEAD_PROFILE } from "./head-profile";
import {
  applySculptStrokes,
  createSculptStroke,
  parseSculptStrokes,
} from "./sculpt-strokes";
import { nearestVertexZ } from "./sculpt-toy-skull";

describe("sculpt strokes", () => {
  it("parses legacy move JSON and ignores broken rows", () => {
    const strokes = parseSculptStrokes([
      { id: "chin", origin: [0, -0.66, 0.28], radius: 0.18, delta: [0, 0, 0.04] },
      { origin: [0.5], delta: [0, 0, 1] },
    ]);
    expect(strokes).toHaveLength(1);
    expect(strokes[0]!.id).toBe("chin");
    expect(strokes[0]!.mode).toBe("move");
    expect(strokes[0]!.mirror).toBe(true);
  });

  it("parses inflate without a delta vector", () => {
    const strokes = parseSculptStrokes([
      { id: "pad", origin: [0, -0.66, 0.4], radius: 0.2, mode: "inflate", strength: 0.08 },
    ]);
    expect(strokes).toHaveLength(1);
    expect(strokes[0]!.mode).toBe("inflate");
    expect(strokes[0]!.delta).toEqual([0, 0, 0]);
    expect(strokes[0]!.strength).toBe(0.08);
  });

  it("pushes a local pad on the dense skull without opening the mesh", () => {
    const geometry = buildHeadGeometryFromProfile(DEFAULT_HEAD_PROFILE);
    const before = nearestVertexZ(geometry, 0, -0.66);
    applySculptStrokes(geometry, [
      { id: "chin", origin: [0, -0.66, before], radius: 0.22, delta: [0, 0, 0.08], mode: "move", mirror: false },
    ]);
    expect(nearestVertexZ(geometry, 0, -0.66)).toBeGreaterThan(before + 0.02);
    expect(geometry.getIndex()).toBeTruthy();
    geometry.dispose();
  });

  it("inflates along vertex normals", () => {
    const geometry = buildHeadGeometryFromProfile(DEFAULT_HEAD_PROFILE);
    const before = nearestVertexZ(geometry, 0, -0.66);
    applySculptStrokes(geometry, [
      createSculptStroke({
        id: "chin_inflate",
        origin: [0, -0.66, before],
        radius: 0.22,
        mode: "inflate",
        strength: 0.08,
        mirror: false,
      }),
    ]);
    expect(nearestVertexZ(geometry, 0, -0.66)).toBeGreaterThan(before + 0.02);
    geometry.dispose();
  });

  it("pinches along vertex normals", () => {
    const geometry = buildHeadGeometryFromProfile(DEFAULT_HEAD_PROFILE);
    const before = nearestVertexZ(geometry, 0.4, -0.1);
    applySculptStrokes(geometry, [
      createSculptStroke({
        id: "cheek_pinch",
        origin: [0.4, -0.1, before],
        radius: 0.24,
        mode: "pinch",
        strength: 0.08,
        mirror: false,
      }),
    ]);
    expect(nearestVertexZ(geometry, 0.4, -0.1)).toBeLessThan(before - 0.015);
    geometry.dispose();
  });

  it("flattens a pad toward a local plane", () => {
    const geometry = buildHeadGeometryFromProfile(DEFAULT_HEAD_PROFILE);
    const before = nearestVertexZ(geometry, 0, -0.66);
    applySculptStrokes(geometry, [
      { id: "chin", origin: [0, -0.66, before], radius: 0.22, delta: [0, 0, 0.1], mode: "move", mirror: false },
    ]);
    const padded = nearestVertexZ(geometry, 0, -0.66);
    applySculptStrokes(geometry, [
      createSculptStroke({
        id: "chin_flat",
        origin: [0, -0.66, padded],
        radius: 0.24,
        mode: "flatten",
        strength: 0.4,
        mirror: false,
      }),
    ]);
    const flattened = nearestVertexZ(geometry, 0, -0.66);
    expect(padded).toBeGreaterThan(before + 0.04);
    expect(flattened).toBeLessThan(padded - 0.02);
    geometry.dispose();
  });
});
