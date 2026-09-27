import { describe, expect, it } from "vitest";
import {
  BLENDER_ARMATURE_X_90,
  centerPositions,
  headBoneWeight,
  isHeadBoneName,
  isStandingBindPose,
  rotateByQuat,
  shouldKeepHeadVertex,
} from "./extract-head-from-glb";

describe("extract-head-from-glb", () => {
  it("recognizes Mixamo head bones and ignores hands", () => {
    expect(isHeadBoneName("mixamorig:Head")).toBe(true);
    expect(isHeadBoneName("mixamorig:Neck")).toBe(true);
    expect(isHeadBoneName("mixamorig:LeftHand")).toBe(false);
    expect(isHeadBoneName("mixamorig:Spine2")).toBe(false);
  });

  it("keeps vertices whose skin is mostly head/neck", () => {
    const headIds = new Set([2, 3]);
    expect(headBoneWeight([2, 1, 0, 0], [0.7, 0.3, 0, 0], headIds)).toBeCloseTo(0.7);
    expect(shouldKeepHeadVertex(0.7)).toBe(true);
    expect(shouldKeepHeadVertex(0.2)).toBe(false);
  });

  it("treats Mixamo body bounds as already standing Y-up", () => {
    expect(isStandingBindPose([-2.2, 0, -0.89], [2.2, 4.9, 0.89])).toBe(true);
    expect(isStandingBindPose([-0.89, -0.89, -0.89], [0.89, 0.89, 0.89])).toBe(false);
  });

  it("does not bake Blender armature +90 X onto a standing bind pose", () => {
    const [x, y, z] = rotateByQuat(BLENDER_ARMATURE_X_90, 0, 1, 0);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(0);
    expect(z).toBeCloseTo(1);
    const face = rotateByQuat(BLENDER_ARMATURE_X_90, 0, 0, 1);
    expect(face[1]).toBeCloseTo(-1);
  });

  it("recenters a head without rotating it onto its face", () => {
    const positions = [0, 4, 0.4, 0, 3, 0.4, 0, 3.5, -0.2];
    centerPositions(positions);
    expect(positions[1]).toBeCloseTo(0.5);
    expect(positions[4]).toBeCloseTo(-0.5);
    expect(positions[2]).toBeGreaterThan(positions[8]!);
  });
});
