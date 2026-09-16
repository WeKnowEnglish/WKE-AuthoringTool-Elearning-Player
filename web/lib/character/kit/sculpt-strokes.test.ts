import { describe, expect, it } from "vitest";
import { buildHeadGeometryFromProfile } from "./build-head-geometry";
import { DEFAULT_HEAD_PROFILE } from "./head-profile";
import { applySculptStrokes, parseSculptStrokes } from "./sculpt-strokes";
import { nearestVertexZ } from "./sculpt-toy-skull";

describe("sculpt strokes", () => {
  it("parses Cursor JSON and ignores broken rows", () => {
    const strokes = parseSculptStrokes([
      { id: "chin", origin: [0, -0.66, 0.28], radius: 0.18, delta: [0, 0, 0.04] },
      { origin: [0.5], delta: [0, 0, 1] },
    ]);
    expect(strokes).toHaveLength(1);
    expect(strokes[0]!.id).toBe("chin");
    expect(strokes[0]!.mirror).toBe(true);
  });

  it("pushes a local pad on the dense skull without opening the mesh", () => {
    const geometry = buildHeadGeometryFromProfile(DEFAULT_HEAD_PROFILE);
    const before = nearestVertexZ(geometry, 0, -0.66);
    applySculptStrokes(geometry, [
      { id: "chin", origin: [0, -0.66, before], radius: 0.22, delta: [0, 0, 0.08], mirror: false },
    ]);
    expect(nearestVertexZ(geometry, 0, -0.66)).toBeGreaterThan(before + 0.02);
    expect(geometry.getIndex()).toBeTruthy();
    geometry.dispose();
  });
});
